document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:8080/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const student = await response.json();
            
            // Critical: Save the ID so index.html can load the right data
            localStorage.setItem('studentId', student.id);
            localStorage.setItem('studentName', student.name);
            
            // Smooth redirect
            window.location.href = 'index.html';
        } else {
            alert("Invalid Flow credentials. Please try again.");
        }
    } catch (error) {
        console.error("EduFlow Backend Error:", error);
        alert("Backend server is offline.");
    }
});
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const panel = document.querySelector('.glass-panel');

    // ... existing fetch logic here ...
    
    if (response.ok) {
        const student = await response.json();
        localStorage.setItem('studentId', student.id);

        // Start Exit Animation
        panel.style.transition = "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
        panel.style.transform = "scale(0.8) translateY(-50px)";
        panel.style.opacity = "0";
        panel.style.filter = "blur(20px)";

        // Redirect after animation completes
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 700);
    }
});