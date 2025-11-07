
import os
import base64
import io
import json
from PIL import Image
import tensorflow as tf
import uuid
import boto3
from datetime import datetime

s3 = boto3.client('s3')
BUCKET_NAME = 'waste-classifier-model-cis4950'
#MODEL_NAME = ''
table = boto3.resource('dynamodb').Table('waste_classifier_images')

# model is loaded if not already present
#S3_MODEL_PATH = 's3://waste-classifier-model-cis4950/models/waste_classifier_model.h5'
LAMBDA_MODEL_PATH = '/tmp/waste_classifier_model.h5'
if not(os.path.exists('/tmp/waste_classifier_model.h5')):
    # bucket name, filepath in bucket, filepath in lambda
    s3.download_file(BUCKET_NAME, '/models/waste_classifier_model.h5', LAMBDA_MODEL_PATH)
model = tf.keras.models.load_model('waste_classifier_model.h5')

def lambda_handler(event, context):
    ## debug -- remove later
    print(event)
    print("\n\n")
    print(context)
    print("\n\n")
    print(s3.list_objects_v2(Bucket='waste-classifier-model-cis4950'))
    print("\n\n")


    # image preprocessing
    ## add support for receiving event['body'], where body['image'], body['wasteFillPct'], body['recycFillPct']
    img_data = base64.b64decode(event['image'])
    img = Image.open(io.BytesIO(img_data))
    img_array = tf.keras.preprocessing.image.img_to_array(img) / 255.0
    img_array = img_array.reshape(1,224,224,3)
    
    # make prediction with loaded model
    pred = model.predict(img_array)
    pred_class = pred.argmax()
    # map class to binary label: 0 = recyclable, 1 = landfill waste
    # {insert function here}
    waste_binary = 0 if pred_class == 0 else 1 # toy example

    # save image to s3 with BytesIO
    img_id = str(uuid.uuid4()) # uniquely generated image id
    save_destination = 's3://waste-classifier-model-cis4950/image_storage/' + img_id + '.jpg'
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    buffer.seek(0)
    s3_url = f's3://{BUCKET_NAME}/image_storage/{img_id}.jpg'
    s3.upload_fileobj(buffer, BUCKET_NAME, '/'.join(s3_url.split('/')[3:]))  # upload to 'image_storage/{img_id}.jpg'

    # save image metadata to dynamodb
    table.put_item(
        Item = {
            'img_id':img_id,
            'predictions':pred,
            'waste_binary':waste_binary,
            'timestamp':str(datetime.now())
            's3_url':s3_url
            # add name of model used
        }
    )

    # send to ESP32 with MQTT
    iot.publish(
        topic="esp32/image/waste_classification", ##
        qos=1,
        payload=json.dumps({
            'class':pred_class,
            'waste_binary':waste_binary,
            'img_id':img_id
        })
    )
    ## debug -- remove later
    print(pred_class, waste_binary, '/'.join(s3_url.split('/')[3:]))
    return {
        'statusCode':200
        'body':f'Published to receiver ESP32: class {pred_class}, <{boolean(waste_binary)}> waste result for {img_id}.jpg'
    }

    '''return {
        'statusCode':200
        'body':json.dumps({
            'class':pred_class,
            'img_id':image_id
        })
    }'''

#

'''   ### https://huggingface.co/watersplash/waste-classification ###
import sagemaker
import boto3
from sagemaker.huggingface import HuggingFaceModel

try:
	role = sagemaker.get_execution_role()
except ValueError:
	iam = boto3.client('iam')
	role = iam.get_role(RoleName='sagemaker_execution_role')['Role']['Arn']

# Hub Model configuration. https://huggingface.co/models
hub = {
	'HF_MODEL_ID':'watersplash/waste-classification',
	'HF_TASK':'image-classification'
}

# create Hugging Face Model Class
huggingface_model = HuggingFaceModel(
	transformers_version='4.51.3',
	pytorch_version='2.6.0',
	py_version='py312',
	env=hub,
	role=role, 
)

# deploy model to SageMaker Inference
predictor = huggingface_model.deploy(
	initial_instance_count=1, # number of instances
	instance_type='ml.m5.xlarge' # ec2 instance type
)

from sagemaker.serializers import DataSerializer
	
predictor.serializer = DataSerializer(content_type='image/x-image')

# Make sure the input file "cats.jpg" exists
with open("cats.jpg", "rb") as f:
	data = f.read()
predictor.predict(data)
'''

# test event - event = {'image':'/...'}
# crumpled_paper - https://www.publicdomainpictures.net/pictures/190000/velka/crumpled-paper-146988600714V.jpg - encoded with https://base64.guru/converter/encode/image
