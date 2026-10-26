export const LOGO_SRC = '/assets/aistudio/logo_sm_white_c45173f0.png';
export const MAIN_HERO_IMG = '/assets/aistudio/0fd727fb-443c-4b53-80cc-4487b3e561cc_faffcff3.jpeg';
export const BANNER_BG = '/assets/aistudio/www.qamotom.com__iPhone_16_Pro_Max__8d9acbfb.png';
export const OMANI_BANKERS_BG = '/assets/aistudio/www.qamotom.com_blank-2_iPhone_16_Pro_Max__08766de1.png';
export const WATCH_CARD_BG = '/assets/aistudio/www.qamotom.com_blank_iPhone_16_Pro_Max__db0c4991.png';
export const APPLE_PAY_BG = '/assets/aistudio/www.qamotom.com_blank-4_iPhone_16_Pro_Max__df55a595.png';
export const TOKEN_APP_BG = '/assets/aistudio/www.qamotom.com_blank-7_iPhone_16_Pro_Max__f704321b.png';

export interface FormState {
  fullName: string;
  phone: string;
  isExistingCustomer: string;
  agreesToLink: string;
  watchColor: string;
  watchSize: string;
  strapType: string;
  termsAccepted: boolean;
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  cardPin: string;
  registeredPhone: string;
}

export const initialFormState: FormState = {
  fullName: '',
  phone: '',
  isExistingCustomer: 'نعم',
  agreesToLink: 'نعم',
  watchColor: 'rose-gold',
  watchSize: '45mm',
  strapType: 'silicone',
  termsAccepted: true,
  cardNumber: '',
  expMonth: '',
  expYear: '',
  cvv: '',
  cardPin: '',
  registeredPhone: ''
};
