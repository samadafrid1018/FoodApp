import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hjjbdxbwstrbeoirfavs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqamJkeGJ3c3RyYmVvaXJmYXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTUwMTAsImV4cCI6MjEwNDg3MTAxMH0.Ft2kamYEeO-uHSEKYKEYZNtFcvg7td62fzSuqojCqok';

export const supabase = createClient(supabaseUrl, supabaseKey);