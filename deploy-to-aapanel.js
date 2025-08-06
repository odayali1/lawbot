const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const axios = require('axios');
const FormData = require('form-data');

// aaPanel Configuration
const AAPANEL_CONFIG = {
    baseUrl: 'https://137.184.199.11:24172/a1abc047',
    apiToken: 'HCvrJDOL5SsXdbmt7MKEhiUkCaiiuq2K',
    domain: 'aidemo.dollany.app'
};

class AAPanelDeployer {
    constructor(config) {
        this.config = config;
        this.axios = axios.create({
            baseURL: config.baseUrl,
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
                'Content-Type': 'application/json'
            },
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false // For self-signed certificates
            })
        });
    }

    async createSite() {
        try {
            console.log('Creating website in aaPanel...');
            const response = await this.axios.post('/api/site/create', {
                domain: this.config.domain,
                port: 80,
                ps: 'LawBot Application',
                path: `/www/wwwroot/${this.config.domain}`,
                type_id: 0,
                version: '7.4'
            });
            console.log('Website created successfully:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error creating website:', error.response?.data || error.message);
            throw error;
        }
    }

    async uploadFiles() {
        try {
            console.log('Creating deployment package...');
            
            // Create a zip file with the application
            const output = fs.createWriteStream('lawbot-deploy.zip');
            const archive = archiver('zip', { zlib: { level: 9 } });
            
            archive.pipe(output);
            
            // Add backend files
            archive.file('package.json', { name: 'package.json' });
            archive.file('app.js', { name: 'app.js' });
            archive.file('server.js', { name: 'server.js' });
            archive.directory('routes/', 'routes/');
            archive.directory('models/', 'models/');
            archive.directory('middleware/', 'middleware/');
            archive.directory('config/', 'config/');
            archive.directory('scripts/', 'scripts/');
            
            // Add frontend build
            if (fs.existsSync('client/build')) {
                archive.directory('client/build/', 'public/');
            }
            
            // Add environment template
            archive.append(`# Production Environment Variables
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/lawbot_prod
JWT_SECRET=your-super-secret-jwt-key-change-this
FRONTEND_URL=https://${this.config.domain}
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
`, { name: '.env.example' });
            
            await archive.finalize();
            
            return new Promise((resolve, reject) => {
                output.on('close', () => {
                    console.log(`Archive created: ${archive.pointer()} total bytes`);
                    resolve('lawbot-deploy.zip');
                });
                
                archive.on('error', (err) => {
                    reject(err);
                });
            });
        } catch (error) {
            console.error('Error creating package:', error);
            throw error;
        }
    }

    async installNodeJS() {
        try {
            console.log('Installing Node.js...');
            const response = await this.axios.post('/api/site/nodejs/install', {
                version: '18.17.0'
            });
            console.log('Node.js installation initiated:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error installing Node.js:', error.response?.data || error.message);
            // Continue even if Node.js is already installed
        }
    }

    async setupSSL() {
        try {
            console.log('Setting up SSL certificate...');
            const response = await this.axios.post('/api/site/ssl/lets_encrypt', {
                domain: this.config.domain,
                email: 'admin@dollany.app'
            });
            console.log('SSL setup initiated:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error setting up SSL:', error.response?.data || error.message);
            // Continue even if SSL setup fails
        }
    }

    async deploy() {
        try {
            console.log('Starting deployment to aaPanel...');
            
            // Step 1: Create website
            await this.createSite();
            
            // Step 2: Install Node.js
            await this.installNodeJS();
            
            // Step 3: Create deployment package
            const packagePath = await this.uploadFiles();
            
            // Step 4: Setup SSL (optional)
            await this.setupSSL();
            
            console.log('\n=== DEPLOYMENT COMPLETED ===');
            console.log(`Website: https://${this.config.domain}`);
            console.log('\nNext steps:');
            console.log('1. Upload the lawbot-deploy.zip file to your server');
            console.log('2. Extract it to /www/wwwroot/' + this.config.domain);
            console.log('3. Install dependencies: npm install');
            console.log('4. Configure environment variables in .env file');
            console.log('5. Start the application: npm start');
            console.log('\nManual steps required:');
            console.log('- Set up MongoDB database');
            console.log('- Configure reverse proxy for Node.js app');
            console.log('- Set up PM2 for process management');
            
        } catch (error) {
            console.error('Deployment failed:', error);
            throw error;
        }
    }
}

// Run deployment
if (require.main === module) {
    const deployer = new AAPanelDeployer(AAPANEL_CONFIG);
    deployer.deploy().catch(console.error);
}

module.exports = AAPanelDeployer;