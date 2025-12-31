/* =========================================================================
    PARTICLE ENGINE (The Atmospheric Background)
========================================================================= */
var ParticleEngine = (function() {
    'use strict';
    function ParticleEngine(canvas_id) {
        var canvas = document.getElementById(canvas_id);
        if(!canvas) return;

        this.stage = new createjs.Stage(canvas);
        this.totalWidth = canvas.width = canvas.offsetWidth;
        this.totalHeight = canvas.height = canvas.offsetHeight;
        
        // High-End Celestial Settings
        this.particleSettings = [
            {id:"small", num:150, ballwidth:2, alphamax:0.4, color:"#0cdbf3", fill:false}, 
            {id:"medium", num:50, ballwidth:5, alphamax:0.3, color:"#6fd2f3", fill:true}, 
            {id:"large", num:5, ballwidth:40, alphamax:0.1, color:"#93e9f3", fill:true}
        ];

        this.lights = [
            {ellipseWidth:400, ellipseHeight:100, alpha:0.3, offsetX:0, offsetY:0, color:"#6ac6e8"}, 
            {ellipseWidth:350, ellipseHeight:250, alpha:0.2, offsetX:-50, offsetY:0, color:"#54d5e8"}
        ];

        this.drawBgLight = function() {
            this.lights.forEach((l, i) => {
                var light = new createjs.Shape();
                light.graphics.beginFill(l.color).drawEllipse(0, 0, l.ellipseWidth, l.ellipseHeight);
                light.regX = l.ellipseWidth/2;
                light.regY = l.ellipseHeight/2;
                light.x = this.totalWidth/2 + l.offsetX;
                light.y = this.totalHeight/2 + l.offsetY;
                light.alpha = l.alpha;
                light.compositeOperation = "screen";
                
                var blur = new createjs.BlurFilter(100, 100, 1);
                light.filters = [blur];
                light.cache(-50, -50, l.ellipseWidth+100, l.ellipseHeight+100);
                
                this.stage.addChildAt(light, 0);
                gsap.to(light, {
                    duration: 10 + (i * 2), 
                    scaleX: 1.5, scaleY: 1.2, 
                    repeat: -1, yoyo: true, ease: "sine.inOut"
                });
            });
        };

        this.drawParticles = function() {
            this.particleSettings.forEach(set => {
                for (var s = 0; s < set.num; s++) {
                    var circle = new createjs.Shape();
                    if(set.fill) circle.graphics.beginFill(set.color).drawCircle(0, 0, set.ballwidth);
                    else circle.graphics.beginStroke(set.color).setStrokeStyle(1).drawCircle(0, 0, set.ballwidth);
                    
                    circle.x = Math.random() * this.totalWidth;
                    circle.y = Math.random() * this.totalHeight;
                    circle.alpha = Math.random() * set.alphamax;
                    circle.alphaMax = set.alphamax;
                    
                    this.stage.addChild(circle);
                    this.animateBall(circle);
                }
            });
        };

        this.animateBall = function(ball) {
            gsap.to(ball, {
                duration: 5 + Math.random() * 10,
                x: ball.x + (Math.random() * 200 - 100),
                y: ball.y + (Math.random() * 200 - 100),
                alpha: Math.random() * ball.alphaMax,
                ease: "sine.inOut",
                onComplete: () => this.animateBall(ball)
            });
        };

        this.drawBgLight();
        this.drawParticles();
    }

    ParticleEngine.prototype.render = function() { this.stage.update(); };
    return ParticleEngine;
}());

/* =========================================================================
    CORE INTELLIGENCE & DATA SYNC
========================================================================= */
let studentData = null;
const syncSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'); 
syncSound.volume = 0.1;

// Fetches dynamic student scores for the rings/bars
async function loadEduFlow(semesterId = 1) {
    const statusText = document.getElementById("flow-status");
    if(statusText) statusText.classList.add("fetching-data");

    try {
        const response = await fetch(`http://localhost:8080/api/dashboard/${semesterId}`);
        
        if (response.status === 404 || response.status === 500) {
            // Server is ON, but this specific semester has no data yet
            showToast("Semester Data Not Found in Database");
            return;
        }

        const data = await response.json();
        renderDashboard(data);
        const toast = document.querySelector(".error-toast");
        if (toast) toast.remove();

    } catch (err) {
        // Only show "Server Offline" if the backend is actually closed
        showErrorToast("Server Truly Offline - Restart NetBeans");
    } finally {
        if(statusText) setTimeout(() => statusText.classList.remove("fetching-data"), 1000);
    }
}

function renderDashboard(data) {
    gsap.fromTo(".card", { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.1 });
    document.querySelectorAll(".card").forEach(card => updateVisuals(card, data));
    displayPrediction(data);
}

function updateVisuals(card, data) {
    // 1. Learning Flow Ring
    const ring = card.querySelector(".ring-progress");
    const ringText = card.querySelector(".ring-text");
    if (ring && ringText) {
        const p = data.learningProgress;
        const offset = 314 - (314 * p) / 100;
        gsap.to(ring, { strokeDashoffset: offset, duration: 1.5, ease: "power2.out" });
        ringText.textContent = p + "%";
    }

    // 2. Skill Momentum Bars
    card.querySelectorAll(".bar").forEach(bar => {
        const skillName = bar.parentElement.querySelector("span").innerText.trim();
        if (data.skills && data.skills[skillName] !== undefined) {
            gsap.to(bar, { width: data.skills[skillName] + "%", duration: 1 });
        }
    });

    // 3. Consistency Tracker
    const fill = card.querySelector(".fill");
    const percent = card.querySelector(".percent");
    if (fill && percent) {
        gsap.to(fill, { width: data.consistency + "%", duration: 1 });
        percent.textContent = data.consistency + "%";
    }
}

/* =========================================================================
    STUDENT REFLECTION (The Diary)
========================================================================= */
async function saveNote() {
    const input = document.getElementById("reflectionInput");
    const content = input.value.trim();
    const sId = localStorage.getItem('studentId') || 1;

    if (!content) return;

    try {
        const response = await fetch(`http://localhost:8080/api/reflections/${sId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: content
        });
        
        if (response.ok) {
            input.value = ""; 
            loadNotes(); // Refresh list immediately
            triggerSuccessPulse();
        }
    } catch (err) { console.error("Sync failed:", err); }
}

async function loadNotes() {
    const sId = localStorage.getItem('studentId') || 1;
    try {
        const response = await fetch(`http://localhost:8080/api/reflections/${sId}`);
        const notes = await response.json();
        
        const list = document.getElementById("notesList");
        list.innerHTML = notes.map(n => `
            <div class="note-item" style="border-bottom: 1px solid rgba(255,255,255,0.1); padding: 12px 0;">
                <small style="color: #3b82f6; font-weight: bold;">${new Date(n.createdAt).toLocaleDateString()}</small>
                <p style="margin: 5px 0 0 0; color: #ccc; font-size: 0.9rem;">${n.content}</p>
            </div>
        `).join('');
    } catch (e) { console.log("Diary empty."); }
}

/* =========================================================================
    TIMELINE & UTILS
========================================================================= */
function setupInfiniteTimeline() {
    const timeline = document.getElementById("timeline");
    if (!timeline || timeline.dataset.cloned) return;
    
    timeline.innerHTML += timeline.innerHTML; 
    timeline.dataset.cloned = "true";
    
    document.querySelectorAll(".time-card").forEach(card => {
        card.addEventListener("click", () => {
            document.querySelectorAll(".time-card").forEach(c => c.classList.remove("active-semester"));
            card.classList.add("active-semester");
            const semesterNum = card.getAttribute("data-semester") || card.innerText.match(/\d+/)[0];
            loadEduFlow(semesterNum);
        });
    });
}

function displayPrediction(data) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30); // Simple demo logic
    const flowCard = document.querySelector('[data-type="flow"]');
    if(!flowCard) return;

    let predElem = document.getElementById("prediction-text") || document.createElement("p");
    predElem.id = "prediction-text";
    predElem.className = "prediction-style";
    predElem.innerHTML = `✨ Est. Completion: <strong>${targetDate.toLocaleDateString()}</strong>`;
    flowCard.appendChild(predElem);
}

function showErrorToast() {
    if (!document.querySelector(".error-toast")) {
        const toast = document.createElement("div");
        toast.className = "error-toast";
        toast.innerText = "Server Offline - Check Backend";
        document.body.appendChild(toast);
    }
}

function triggerSuccessPulse() {
    const btn = document.querySelector(".save-btn");
    btn.innerText = "SYNCED ✨";
    gsap.to(btn, { backgroundColor: "#10b981", duration: 0.3 });
    setTimeout(() => {
        btn.innerText = "Sync Reflection";
        gsap.to(btn, { backgroundColor: "#3b82f6", duration: 0.3 });
    }, 2000);
}

/* =========================================================================
    STARTUP WRAPPER
========================================================================= */
var particles;
window.onload = () => {
    // 1. Background
    particles = new ParticleEngine('projector');
    createjs.Ticker.timingMode = createjs.Ticker.RAF;
    createjs.Ticker.addEventListener("tick", () => particles.render());
    
    // 2. Data Initialization
    loadEduFlow(1);
    setupInfiniteTimeline();
    loadNotes(); 
};

window.onresize = () => {
    const canvas = document.getElementById('projector');
    if(canvas && particles) {
        particles.totalWidth = canvas.width = canvas.offsetWidth;
        particles.totalHeight = canvas.height = canvas.offsetHeight;
    }
};