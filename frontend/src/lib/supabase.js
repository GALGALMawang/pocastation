import { createClient } from '@supabase/supabase-js';

const SB_URL = 'https://aizxaryprtbobftvlzib.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpenhhcnlwcnRib2JmdHZsemliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzE2ODksImV4cCI6MjA5NDQ0NzY4OX0.rgEhIqk_FnDPV8Fnsf2CaDCQbRBUkTnn9D5XWoMJCZ8';

export const supabase = createClient(SB_URL, SB_KEY);
