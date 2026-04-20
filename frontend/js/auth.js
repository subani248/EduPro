document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        const errorDiv = document.getElementById('loginError');
        
        try {
          const data = await fetchAPI('/auth/login', {
            method: 'POST',
            body: { email, password, role }
          });
          
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data));
          
          if (data.role === 'Teacher') {
            window.location.href = 'teacher-dashboard.html';
          } else {
            window.location.href = 'student-dashboard.html';
          }
        } catch (err) {
          errorDiv.textContent = err.message;
        }
      });
    }
});
