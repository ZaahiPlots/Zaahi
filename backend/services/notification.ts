import nodemailer from 'nodemailer';
import twilio from 'twilio';
import axios from 'axios';

class NotificationService {
  private smsClient: twilio.Twilio;
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    this.smsClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template: string, data: any, to: string, language?: 'EN' | 'AR' | 'RU'): Promise<void> {
    const message = this.getTemplate(template, data, language);
    // Generic send logic
  }

  async sendSMS(message: string, to: string): Promise<void> {
    await this.smsClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });
  }

  async sendEmail(subject: string, message: string, to: string): Promise<void> {
    await this.emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      text: message,
    });
  }

  async sendPush(token: string, title: string, body: string): Promise<void> {
    const response = await axios.post('https://fcm.googleapis.com/fcm/send', {
      notification: {
        title: title,
        body: body,
      },
      to: token,
    }, {
      headers: {
        'Authorization': `key=${process.env.FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(response.data);
  }

  async sendWhatsApp(message: string, to: string): Promise<void> {
    await this.smsClient.messages.create({
      body: message,
      from: process.env.WHATSAPP_PHONE_NUMBER,
      to: to,
    });
  }

  private getTemplate(template: string, data: any, language?: 'EN' | 'AR' | 'RU'): string {
    // Logic to fetch and return the appropriate template based on the parameters
    return '';
  }
}

export default new NotificationService();