import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nfsilvvmwuzwvdjjhosg.supabase.co/'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mc2lsdnZtd3V6d3Zkampob3NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjAxMTIsImV4cCI6MjA2NjMzNjExMn0.V1avuZ-czaVvEjoHKCRSrugte0Tv9rKEiBsdtLUsyRo'

export const supabase = createClient(supabaseUrl, supabaseKey);
