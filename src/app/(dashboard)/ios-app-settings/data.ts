

import { z } from 'zod';

export const iosAppSettingSchema = z.object({
  id: z.string(),
  param: z.string(),
  category: z.string().nullable().optional(),
  int_value: z.number().nullable(),
  string_value: z.string().nullable(),
  date_value: z.string().nullable().optional(),
  comment: z.string().nullable(),
});

export type IosAppSetting = z.infer<typeof iosAppSettingSchema>;

export const admobSettingSchema = z.object({
    ad_type: z.string(),
    active: z.number(), // 0 or 1
    ad_id: z.string(),
    top_margin: z.number(),
    bottom_margin: z.number(),
    custom: z.number(),
    custom_width: z.number(),
    custom_height: z.number(),
    frequency: z.number(),
    home_screen: z.number(),
    fav_screen: z.number(),
    content_screen: z.number(),
});

export type AdmobSetting = z.infer<typeof admobSettingSchema>;


export const similarAppSchema = z.object({
    id: z.number(),
    app_name: z.string(),
    app_name_en: z.string(),
    app_name_de: z.string(),
    app_name_es: z.string(),
    app_name_fr: z.string(),
    app_name_pt: z.string(),
    app_name_ru: z.string(),
    app_name_zh: z.string(),
    app_name_ja: z.string(),
    app_name_ko: z.string(),
    app_name_it: z.string(),
    app_name_id: z.string(),
    app_name_vi: z.string(),
    app_name_tr: z.string(),
    app_icon_url: z.string().url(),
    apple_id: z.string(),
    visible: z.number(), // 0 or 1
});

export type SimilarApp = z.infer<typeof similarAppSchema>;


export const appVersionSettingSchema = z.object({
    ver: z.string(),
    app_update: z.number(), // 0 or 1
    mandatory: z.number(), // 0 or 1
    maintenance: z.number(), // 0 or 1
});

export type AppVersionSetting = z.infer<typeof appVersionSettingSchema>;

export const appFontSizeSettingSchema = z.object({
    device: z.string(),
    base_font_small_size: z.number(),
    heading_font_small_size: z.number(),
    subheading_font_small_size: z.number(),
    base_font_medium_size: z.number(),
    heading_font_medium_size: z.number(),
    subheading_font_medium_size: z.number(),
    base_font_large_size: z.number(),
    heading_font_large_size: z.number(),
    subheading_font_large_size: z.number(),
});

export type AppFontSizeSetting = z.infer<typeof appFontSizeSettingSchema>;

export const navigationSettingSchema = z.object({
    param: z.string(),
    active: z.number(), // 0 or 1
});

export type NavigationSetting = z.infer<typeof navigationSettingSchema>;

export const promoSettingSchema = z.object({
    id: z.number(),
    param: z.string(),
    int_value: z.number().nullable(),
    string_value: z.string().nullable(),
    date_value: z.string().nullable(),
    comment: z.string().nullable(),
});

export type PromoSetting = z.infer<typeof promoSettingSchema>;
