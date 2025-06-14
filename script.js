// Initialize Supabase
const SUPABASE_URL = 'https://ygfjhicakkcctduoscdy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZmpoaWNha2tjY3RkdW9zY2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MDgzMDQsImV4cCI6MjA2MDQ4NDMwNH0.pjDlkmoNMpJGxf7viom2hNgWTVEUUz7yYWgMUAaCx8c';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', function() {
    // SIGNUP
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const inputs = signupForm.querySelectorAll('input');
            const username = inputs[0].value.trim();
            const phone = inputs[1].value.trim();
            const email = inputs[2].value.trim();
            const password = inputs[3].value;
            const confirmPassword = inputs[4].value;
            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { username, phone }
                }
            });
            if (error) {
                alert('Signup failed: ' + error.message);
            } else {
                // Insert into profiles table
                const user = data.user;
                if (user) {
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert([
                            {
                                id: user.id, // assuming your table uses auth.uid() as PK
                                username,
                                phone,
                                email
                            }
                        ]);
                    if (insertError) {
                        alert('Signup succeeded but failed to save profile: ' + insertError.message);
                    } else {
                        alert('Signup successful!');
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    alert('Signup successful!');
                    window.location.href = 'dashboard.html';
                }
            }
        });
    }
    // LOGIN
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const inputs = loginForm.querySelectorAll('input');
            const email = inputs[0].value.trim();
            const password = inputs[1].value;
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) {
                alert('Login failed: ' + error.message);
            } else {
                alert('Login successful!');
                window.location.href = 'dashboard.html';
            }
        });
    }
});
