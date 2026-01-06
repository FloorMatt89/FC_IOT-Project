# EcoTradeBin: Smart Recycling Meets Financial Gamification

An end-to-end IoT and cloud-based smart recycling system that gamifies sustainability through simulated stock trading, rewarding consistent recycling behavior with virtual investments.


## Demo

[![Demo Video](https://img.youtube.com/vi/gx7DyOdboQc/0.jpg)](https://www.youtube.com/watch?v=gx7DyOdboQc)


## Overview

EcoTradeBin is an innovative IoT project that transforms waste management into an engaging, gamified experience. By combining smart hardware, cloud computing, and financial trading simulation, the system promotes sustainability and financial literacy through interactive recycling.

### How It Works

The system creates a unique connection between recycling behavior and simulated stock market investments:

1. **Smart Detection**: ESP32-equipped bins use cameras and ultrasonic sensors to detect and classify recycled items in real-time
2. **Cloud Processing**: Images are sent to AWS, where machine learning models classify waste types (recyclable vs. waste)
3. **Data Tracking**: Classification results are stored in DynamoDB, tracking recycling consistency and statistics
4. **Trading Rewards**: Consistent recycling behavior triggers simulated stock trades using news sentiment analysis
5. **Portfolio Growth**: Users see their virtual portfolio grow as they maintain recycling streaks and proper waste classification

## Key Features

### IoT Hardware
- **ESP32 Microcontrollers**: Low-power devices with WiFi connectivity
- **Camera Sensors**: Capture images of items placed in the bin
- **Ultrasonic Sensors**: Monitor bin fill levels in real-time
- **Servo Motors**: Automated lid control for improved user experience
- **MQTT Communication**: Real-time data transmission to AWS IoT Core

### Cloud Infrastructure
- **AWS IoT Core**: Manages device connections and message routing via MQTT protocol
- **AWS Lambda**: Serverless functions for image processing and waste classification
- **Amazon SageMaker**: Machine learning models for waste type identification
- **Amazon S3**: Stores captured images for processing and training data
- **Amazon DynamoDB**: NoSQL database storing classification results and user statistics

### Trading System
- **News Sentiment Analysis**: AI-powered sentiment analysis using Azure OpenAI (GPT-5-nano)
- **Alpaca Trading API**: Paper trading integration for simulated stock market transactions
- **Real-time WebSocket**: Live market data streaming and automated trade execution
- **Dynamic Strategy**: Buys on positive sentiment (>85/100), sells on negative (<50/100)

### Web Dashboard
- **Real-time Analytics**: Live display of recycling statistics and trends
- **Portfolio Visualization**: Interactive charts showing virtual investment performance
- **Recycling Metrics**:
  - Current streak (consecutive days of recycling)
  - Weekly item count
  - Recycling rate (percentage of properly classified recyclables)
  - Bin fill level monitoring
- **Recent Activity Feed**: Timeline of recent classifications with timestamps
- **Trading Bot Control**: Start/stop controls for the automated trading system

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   ESP32 Bins    │         │   AWS Cloud      │         │  Web Dashboard  │
│                 │         │                  │         │   (Next.js)     │
│  • Camera       │──MQTT──▶│  • IoT Core      │         │                 │
│  • Ultrasonic   │         │  • Lambda        │         │  • Recycling    │
│  • Servo        │         │  • SageMaker     │◀────────│    Stats        │
│                 │         │  • DynamoDB      │  API    │  • Portfolio    │
└─────────────────┘         │  • S3            │         │  • Live Updates │
                            └──────────────────┘         └─────────────────┘
                                     │                            │
                                     │                            │
                            ┌────────▼──────────┐                │
                            │  AWS EC2 Backend  │◀───────────────┘
                            │                   │    Control API
                            │  • Trading Bot    │
                            │  • News Analysis  │
                            │  • Alpaca API     │
                            └───────────────────┘
                                     │
                                     ▼
                            Simulated Stock Market
                            (Paper Trading)
```

## Technology Stack

### Hardware
- **ESP32-CAM**: Camera module for image capture
- **HC-SR04**: Ultrasonic distance sensor
- **SG90 Servo Motor**: Lid automation
- **Arduino IDE**: Firmware development

### Cloud Services (AWS)
- **IoT Core**: Device management and MQTT broker
- **Lambda**: Serverless compute
- **SageMaker**: ML model hosting and inference
- **DynamoDB**: NoSQL database
- **S3**: Object storage
- **EC2**: Backend server hosting

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Control API server
- **Alpaca Trade API**: Stock trading simulation
- **Azure OpenAI**: GPT-5-nano for sentiment analysis
- **WebSocket**: Real-time market data streaming

### Frontend
- **Next.js 16**: React framework with server-side rendering
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Recharts**: Data visualization library
- **AWS SDK**: DynamoDB integration

### Deployment
- **Vercel**: Frontend hosting and edge functions
- **AWS EC2**: Backend trading bot hosting
- **PM2**: Process management for Node.js services

## Project Structure

```
FC_IOT-Project/
├── esp32-hardware/              # ESP32 firmware and sketches
│   ├── arduino_cam_to_AWS/      # Camera with AWS integration
│   ├── ultrasonic_plus_communication/  # Fill level monitoring
│   ├── servo_plus_camera/       # Automated lid control
│   └── camera_sensing_lid/      # Combined camera and lid logic
│
├── ecotradebin-dashboard/       # Next.js web application
│   ├── app/
│   │   ├── api/                 # API routes
│   │   │   ├── iot/             # IoT device endpoints
│   │   │   └── recycling/       # DynamoDB data endpoints
│   │   ├── components/          # React components
│   │   ├── page.tsx             # Main dashboard page
│   │   └── globals.css          # Global styles
│   ├── package.json             # Frontend dependencies
│   └── .env.local               # Environment configuration
│
├── awsEC2-backend/              # Trading bot and control API
│   ├── server.js                # Trading service with sentiment analysis
│   ├── control-api.js           # REST API for bot control
│   ├── package.json             # Backend dependencies
│   └── .env                     # AWS and API credentials
│
├── AWS_IOT_SETUP.md             # IoT Core configuration guide
├── DEPLOYMENT_GUIDE.md          # Production deployment instructions
├── DYNAMODB_SETUP.md            # Database configuration guide
└── README.md                    # This file
```

## Getting Started

### Prerequisites

- **Hardware**: ESP32-CAM development board, HC-SR04 sensor, servo motor
- **AWS Account**: With access to IoT Core, Lambda, DynamoDB, S3, and SageMaker
- **Azure Account**: For OpenAI API access (GPT-5-nano)
- **Alpaca Account**: For paper trading API credentials
- **Node.js**: Version 16.x or higher
- **Arduino IDE**: For ESP32 firmware development

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/FC_IOT-Project.git
cd FC_IOT-Project
```

#### 2. Set Up AWS Infrastructure

Follow the detailed guides:
- [AWS IoT Setup](./AWS_IOT_SETUP.md) - Configure IoT Core and device certificates
- [DynamoDB Setup](./DYNAMODB_SETUP.md) - Create database tables and configure access

#### 3. Configure ESP32 Hardware

```bash
cd esp32-hardware/arduino_cam_to_AWS
```

Update the Arduino sketch with your credentials:
- WiFi SSID and password
- AWS IoT endpoint
- Device certificates (Root CA, device certificate, private key)

Upload to your ESP32 using Arduino IDE.

#### 4. Set Up Backend Trading Service

```bash
cd awsEC2-backend
npm install
```

Create `.env` file:
```env
# Alpaca Trading API
APCA_API_KEY_ID=your_alpaca_key
APCA_API_SECRET_KEY=your_alpaca_secret

# Azure OpenAI
AZURE_OPENAI_API_KEY=your_azure_key

# Trading Thresholds
NEWS_BUY_THRESHOLD=85
NEWS_SELL_THRESHOLD=50

# Control API
CONTROL_API_KEY=your_secure_api_key
VERCEL_URL=https://your-dashboard.vercel.app
```

Start the trading service:
```bash
npm start
# or with PM2 for production:
pm2 start server.js --name trading-service
```

#### 5. Set Up Web Dashboard

```bash
cd ecotradebin-dashboard
npm install
```

Create `.env.local` file:
```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_DYNAMODB_REGION=us-east-1
AWS_IOT_REGION=us-east-1
AWS_IOT_DEVICE_1_NAME=ecotradebin-device-1
AWS_IOT_DEVICE_2_NAME=ecotradebin-device-2

# Backend API
EC2_CONTROL_API_URL=http://your-ec2-ip:3001
EC2_CONTROL_API_KEY=your_control_api_key

# Alpaca (for dashboard display)
APCA_API_KEY_ID=your_alpaca_key
APCA_API_SECRET_KEY=your_alpaca_secret
```

Start the development server:
```bash
npm run dev
```

Visit http://localhost:3000 to view the dashboard.

### Deployment

#### Deploy Dashboard to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd ecotradebin-dashboard
vercel
```

Add environment variables in Vercel dashboard under Settings → Environment Variables.

#### Deploy Backend to AWS EC2

Follow the comprehensive [Deployment Guide](./DEPLOYMENT_GUIDE.md) for:
- EC2 instance setup and configuration
- Security group configuration for ports 3001
- PM2 process management
- Automated startup configuration

## Usage

### Dashboard Features

#### Recycling Tab
- **Bin Status**: Monitor connection status and device ID
- **Current Streak**: Track consecutive days of recycling activity
- **Weekly Items**: View total items recycled this week
- **Recycling Rate**: See percentage of properly classified recyclables
- **Bin Fill Level**: Real-time fill percentage with visual indicator
- **Recent Activity**: Timeline of last 3 classified items with timestamps

#### Trading Tab
- **Portfolio Overview**: Total value, daily change, and performance metrics
- **Holdings**: List of current stock positions with quantities and values
- **Trading History**: Recent buy/sell transactions with timestamps
- **Bot Control**: Start/stop the automated trading system

### How Recycling Affects Trading

1. **Consistent Recycling**: Maintaining daily streaks keeps the trading bot active
2. **Proper Classification**: High recycling rates (>75%) trigger more aggressive buying
3. **Streak Milestones**: Reaching streak goals unlocks bonus trading capital
4. **Portfolio Growth**: Virtual portfolio value correlates with recycling consistency

### Trading Bot Operation

The bot monitors financial news in real-time and executes trades based on AI-powered sentiment analysis:

- **Positive News (Score ≥85)**: Places buy orders for mentioned stocks
- **Negative News (Score ≤50)**: Closes positions in affected stocks
- **Neutral News (50-85)**: Holds current positions

Position sizes are dynamically calculated based on sentiment strength.

## Configuration

### ESP32 Settings
Edit Arduino sketches to adjust:
- Sensor polling intervals
- Image capture quality
- Power-saving modes
- MQTT publish rates

### Dashboard Refresh Rates
In `ecotradebin-dashboard/app/page.tsx`:
```typescript
const IOT_DATA_REFRESH_INTERVAL_MS = 10000;  // 10 seconds
const RECYCLING_DATA_REFRESH_INTERVAL_MS = 30000;  // 30 seconds
```

### Trading Thresholds
In `awsEC2-backend/.env`:
```env
NEWS_BUY_THRESHOLD=85   # Minimum score to trigger buy
NEWS_SELL_THRESHOLD=50  # Maximum score to trigger sell
```

### DynamoDB Query Limits
In `ecotradebin-dashboard/app/api/recycling/route.ts`:
```typescript
const MAX_ITEMS_TO_FETCH = 10;    // Items to query from DB
const MAX_ITEMS_TO_DISPLAY = 3;   // Items to show in UI
```

## API Reference

### IoT Devices API
```
GET /api/iot/devices
```
Returns real-time status of connected ESP32 devices including bin fill levels and connection status.

### Recycling Data API
```
GET /api/recycling
```
Returns recent waste classifications from DynamoDB with calculated recycling statistics.

### Trading Control API
```
GET /status              # Check trading bot status
POST /start              # Start trading bot
POST /stop               # Stop trading bot
GET /health              # Health check endpoint
```

All control endpoints require `x-api-key` header for authentication.

## Troubleshooting

### ESP32 Won't Connect to AWS
- Verify certificates are correctly formatted (no extra spaces/newlines)
- Check AWS IoT Core endpoint URL is correct
- Ensure device certificate is activated in AWS console
- Verify WiFi credentials are correct

### Dashboard Shows "No Data"
- Confirm ESP32 is publishing data to correct MQTT topics
- Check DynamoDB table has entries
- Verify AWS credentials in `.env.local` have read permissions
- Check browser console for API errors

### Trading Bot Not Executing Trades
- Verify Alpaca API credentials are valid
- Check Azure OpenAI API key is active and has quota
- Ensure EC2 security group allows outbound HTTPS (port 443)
- Review PM2 logs: `pm2 logs trading-service`

### High AWS Costs
- Enable DynamoDB on-demand pricing
- Implement caching in API routes to reduce reads
- Use Query with indexes instead of Scan operations
- Reduce ESP32 publish frequency

## Performance Optimization

- **Caching**: Implement Redis for frequently accessed data
- **CDN**: Use Vercel Edge Network for static assets
- **Database**: Create DynamoDB secondary indexes on timestamp
- **Images**: Compress images on ESP32 before upload to S3
- **API**: Use pagination for large dataset queries

## Security Considerations

- Never commit `.env` files to version control
- Use IAM roles with minimal required permissions
- Rotate AWS credentials every 90 days
- Enable AWS CloudTrail for audit logging
- Use HTTPS for all API communication
- Implement rate limiting on public endpoints
- Use separate credentials for development and production

## Future Enhancements

- [ ] Mobile app for iOS and Android
- [ ] Multiple bin support for businesses and schools
- [ ] Leaderboards and social features
- [ ] Real money micro-investing integration
- [ ] Advanced ML models for specific waste categories
- [ ] Voice feedback using text-to-speech
- [ ] Integration with municipal waste management systems
- [ ] Carbon footprint tracking and reporting

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- AWS for cloud infrastructure and ML services
- Alpaca Markets for paper trading API
- Azure OpenAI for sentiment analysis capabilities
- ESP32 community for hardware support and libraries
- Next.js team for the excellent React framework

## Contact

For questions or support, please open an issue on GitHub or contact the maintainers.

---

**Built with**: ESP32 • AWS IoT Core • Lambda • SageMaker • DynamoDB • Next.js • Alpaca API • Azure OpenAI

**Promoting**: Sustainability • Financial Literacy • IoT Innovation • Cloud Computing
