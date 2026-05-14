import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vzjulnthhypmguxqcogt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_QSdlsAb1euIgy7bnWQ9rnw_KjYqrgUQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
