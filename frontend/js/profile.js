document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth('Student');
    if(user) {
        document.getElementById('profilePic').src = user.profilePic || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
        document.getElementById('fullName').textContent = user.name;
        document.getElementById('email').textContent = user.email;
        document.getElementById('role').textContent = user.role;
        document.getElementById('rollNumber').textContent = user.roll_number || 'Not Assigned';
    }
});
