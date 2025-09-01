import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://andtopqxrmcxizovyfyy.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZHRvcHF4cm1jeGl6b3Z5Znl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0ODA3NTAsImV4cCI6MjA3MjA1Njc1MH0.Z0zoUzS94YHcgTiGAHs4mfoUqoFGdI5bLAmwSLiI2zY";
export const supabase = createClient(supabaseUrl, supabaseKey);
