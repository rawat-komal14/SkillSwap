const socket = io('http://localhost:5000');

let currentUser = localStorage.getItem('skillSwapUser');
let activeChatPartner = null;

async function register() {
    const name = document.getElementById('regName').value.trim();
    const skills = document.getElementById('regSkills').value;
    const wants = document.getElementById('regWant').value;
    
    if (!name) {
        return alert("Name is required");
    }
    
    const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            name, 
            skills_offered: skills, 
            skills_wanted: wants 
        })
    });
    
    if (res.ok) {
        localStorage.setItem('skillSwapUser', name);
        location.reload();
    }
}

async function addNewSkill() {
    const newSkill = document.getElementById('newSkillInput').value.trim();

    if (!newSkill) {
        return;
    }
    
    await fetch('http://localhost:5000/api/add-skill', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            name: currentUser, 
            newSkill 
        })
    });
    
    document.getElementById('newSkillInput').value = '';
    loadApp();
}

async function updateGoals() {
    const newGoals = document.getElementById('newGoalsInput').value.trim();

    if (!newGoals) {
        return;
    }
    
    await fetch('http://localhost:5000/api/update-goals', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            name: currentUser, 
            newGoals 
        })
    });
    
    document.getElementById('newGoalsInput').value = '';
    loadApp();
}

async function loadApp() {
    if (!currentUser) {
        return;
    }
    
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('userDisplay').innerText = currentUser;
    
    socket.emit('join-network', currentUser);

    const cRes = await fetch(`http://localhost:5000/api/my-connections/${currentUser}`);
    const conns = await cRes.json();

    const cDiv = document.getElementById('connectionsList');
    cDiv.innerHTML = conns.length ? '' : '<p style="color:#64748b; font-size:0.85rem;">No active swaps.</p>';

    conns.forEach(name => { 
        cDiv.innerHTML += `<div class="conn-chip" onclick="openChat('${name}')">${name}</div>`; 
    });

    const pRes = await fetch(`http://localhost:5000/api/users/${currentUser}`);
    const partners = await pRes.json();

    const grid = document.getElementById('partnerGrid');
    grid.innerHTML = '';

    partners.forEach(p => {
        grid.innerHTML += `
            <div class="card">
                <h4 style="margin:0; color:var(--primary);">${p.name}</h4>

                <div style="margin: 12px 0;">
                    <p class="skill-tag"><strong>Has:</strong> ${p.skills_offered.join(', ')}</p>
                    <p class="skill-tag"><strong>Needs:</strong> ${p.skills_wanted.join(', ')}</p>
                </div>

                <button class="btn" onclick="sendSwap('${p.name}')">Request Swap</button>
            </div>
        `;
    });

    const nRes = await fetch(`http://localhost:5000/api/my-notifications/${currentUser}`);
    const notes = await nRes.json();

    const nDiv = document.getElementById('notifications');
    nDiv.innerHTML = '';

    notes.forEach(n => {
        nDiv.innerHTML += `
            <div class="card" style="border-left: 5px solid var(--accent); background: rgba(129, 140, 248, 0.1);">
                <p style="margin: 0 0 10px 0;"><b>${n.from}</b> wants to swap!</p>
                <button class="btn btn-accent" onclick="acceptSwap('${n.from}')">Accept</button>
            </div>
        `;
    });
}

async function sendSwap(to) {
    await fetch('http://localhost:5000/api/send-request', { 
        method: 'POST', 
        headers: {
            'Content-Type': 'application/json'
        }, 
        body: JSON.stringify({ 
            from: currentUser, 
            to 
        }) 
    });

    alert(`Request sent to ${to}!`);
}

async function acceptSwap(senderName) {
    const res = await fetch('http://localhost:5000/api/accept-request', { 
        method: 'POST', 
        headers: {
            'Content-Type': 'application/json'
        }, 
        body: JSON.stringify({ 
            from: senderName, 
            to: currentUser 
        }) 
    });

    if (res.ok) {
        loadApp();
    }
}

async function openChat(user) {
    activeChatPartner = user;

    document.getElementById('chatBox').style.display = 'flex';
    document.getElementById('chatTitle').innerText = user;
    
    const res = await fetch(`http://localhost:5000/api/chat-history/${currentUser}/${user}`);
    const history = await res.json();

    const msgDiv = document.getElementById('chatMessages');
    msgDiv.innerHTML = '';
    
    history.forEach(m => {
        if (m.from.toLowerCase() === currentUser.toLowerCase()) {
            addMessage(m.text, 'msg-self');
        } else {
            addMessage(m.text, 'msg-them');
        }
    });
}

function closeChat() {
    document.getElementById('chatBox').style.display = 'none';
}

function sendMsg() {
    const input = document.getElementById('chatInput');

    if (!input.value.trim() || !activeChatPartner) {
        return;
    }
    
    socket.emit('send-chat-message', { 
        to: activeChatPartner, 
        from: currentUser, 
        message: input.value 
    });

    addMessage(input.value, 'msg-self');
    input.value = '';
}

function addMessage(text, cls) {
    const d = document.getElementById('chatMessages');

    const m = document.createElement('div');
    m.className = cls; 
    m.innerText = text;

    d.appendChild(m); 
    d.scrollTop = d.scrollHeight;
}

socket.on('receive-chat-message', (data) => {
    if (activeChatPartner && activeChatPartner.toLowerCase() === data.from.toLowerCase()) {
        addMessage(data.message, 'msg-them');
    } else {
        alert(`New message from ${data.from}`);
    }
});

socket.on('new-request', () => { 
    loadApp(); 
});

socket.on('request-accepted', () => { 
    loadApp(); 
});

function logout() { 
    localStorage.removeItem('skillSwapUser'); 
    location.reload(); 
}

window.onload = loadApp;