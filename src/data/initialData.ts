import { OrderItem } from '../types';

export const INITIAL_ORDERS: OrderItem[] = [];

export function formatToman(num: number): string {
  return new Intl.NumberFormat('fa-IR').format(num) + ' تومان';
}

export function generateShortCode(): string {
  const chars = '23456789abcdefghkmnpqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function buildReceiptShareMessage(
  name: string,
  niyyat: string,
  amal: string,
  shareLink: string
): string {
  const cleanNiyyat = (niyyat || 'همه ملتمسین دعا').trim();
  const cleanAmal = (amal || 'زیارت و دعای نیابتی').trim();
  const sender = name ? `توسط ${name}` : '';

  return `✨ «طرح زیارت نیابتی و اعزام زائر به کربلا» ${sender}\n\n` +
         `🤲 به نیابت از: ${cleanNiyyat}\n` +
         `📿 عمل و دعای درخواستی: ${cleanAmal}\n\n` +
         `این هزینه جهت کمک‌هزینه اعزام زائر به کربلای معلی پرداخت شد تا در حرم‌های مطهر دعاگوی ما باشد.\n\n` +
         `اگر شما هم مایلید نیت خود یا امواتتان را ثبت کرده و در اعزام زائر کربلا سهیم شوید، از طریق این لینک اقدام فرمایید:\n` +
         `🔗 ${shareLink}\n\n` +
         `التماس دعا • خانه زیارت`;
}
