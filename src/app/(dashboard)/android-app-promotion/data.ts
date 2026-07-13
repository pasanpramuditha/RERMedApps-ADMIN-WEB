export type PromotionPeriod = 'today' | 'yesterday' | 'last7days';

export type PromotionPurchaseApp = {
  app_id: number;
  app_name: string;
  app_icon: string;
  db_name: string;
  sku: string;
  order_id: string;
  purchased_date: string;
};

export type PromotionUser = {
  email: string;
  latest_purchase_date: string;
  purchase_count: number;
  purchased_apps: PromotionPurchaseApp[];
};

export type PromotionAppStatus = {
  app_id: number;
  app_name: string;
  app_icon: string;
  package_name: string;
  db_name: string;
  status: 'purchased' | 'installed_not_purchased' | 'not_installed';
  premium: boolean;
  force_premium: boolean;
  registered_date?: string | null;
  last_online?: string | null;
  device?: string | null;
  language?: string | null;
  sku?: string | null;
  order_id?: string | null;
  purchased_date?: string | null;
};

export type PromotionUserProfile = {
  email: string;
  summary: {
    purchased: number;
    installed_not_purchased: number;
    not_installed: number;
    premium: number;
  };
  apps: PromotionAppStatus[];
};

export type PromotionTemplate = {
  id: number;
  template_name: string;
  package_name: string;
  promo_html: string;
  valid_from: string;
  valid_to: string;
  status: string;
  created_at: string;
};

export type PromotionNotificationTemplate = {
  id: number;
  package_name: string;
  notification_type: string;
  key_title: string;
  key_body: string;
  title: string;
  body: string;
  created_at: string;
  translations: {
    title: Record<string, string>;
    body: Record<string, string>;
  };
};

export type PromotionRewardValue = {
  name: string;
  discount: number;
  valid: number;
  active_offer: number;
  description: string;
  iap_type: string;
};

export type PromotionCampaign = {
  id: number;
  template_id: number;
  target_package_name: string;
  campaign_id: string;
  target_email: string;
  target_country: string;
  target_lang: string;
  target_user_type: string;
  reward_type: string;
  reward_value: string;
  valid_from: string;
  valid_to: string;
  status: string;
};

export type CreatePromotionCampaignInput = {
  promotion_type: string;
  template_id: string;
  target_package_name: string;
  campaign_id: string;
  target_email: string;
  target_country: string;
  target_lang: string;
  target_user_type: string;
  reward_type: string;
  reward_value: string;
  valid_from: string;
  valid_to: string;
  status: string;
  notification_enabled: string;
  notification_title: string;
  notification_body: string;
  notification_app_package_name: string;
};
