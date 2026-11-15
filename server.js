const express = require('express');
const cors = require('cors');

const app = express();

const http = require('http').createServer(app);

const io = require('socket.io')(http, { 
    cors: { 
        origin: "*" 
    } 
});

app.use(cors());
app.use(express.json());

let db = { 
    users: [], 
    messages: [], 
    requests: [] 
};

io.on('connection', (socket) => {
    socket.on('join-network', (username) => {
        socket.join(username.toLowerCase());
        console.log(`${username} joined their room.`);
    });

    socket.on('send-chat-message', (data) => {
        const { to, from, message } = data;

        db.messages.push({ 
            from, 
            to, 
            text: message, 
            timestamp: new Date() 
        });

        io.to(to.toLowerCase()).emit('receive-chat-message', { 
            from, 
            message 
        });
    });
});

app.post('/api/register', (req, res) => {
    const { name, skills_offered, skills_wanted } = req.body;

    let user = db.users.find(u => 
        u.name.toLowerCase() === name.toLowerCase()
    );

    if (user) {
        return res.json({ 
            success: true, 
            user 
        });
    } else {
        user = { 
            name, 
            skills_offered: skills_offered 
                ? skills_offered.split(',').map(s => s.trim()) 
                : [],

            skills_wanted: skills_wanted 
                ? skills_wanted.split(',').map(s => s.trim()) 
                : [] 
        };

        db.users.push(user);

        res.json({ 
            success: true, 
            user 
        });
    }
});

app.post('/api/add-skill', (req, res) => {
    const { name, newSkill } = req.body;

    const user = db.users.find(u => 
        u.name.toLowerCase() === name.toLowerCase()
    );

    if (user && newSkill) {
        if (!user.skills_offered.includes(newSkill)) {
            user.skills_offered.push(newSkill);
        }

        res.json({ 
            success: true 
        });
    } else {
        res.status(404).json({ 
            success: false 
        });
    }
});

app.post('/api/update-goals', (req, res) => {
    const { name, newGoals } = req.body;

    const user = db.users.find(u => 
        u.name.toLowerCase() === name.toLowerCase()
    );

    if (user && newGoals) {
        user.skills_wanted = newGoals
            .split(',')
            .map(s => s.trim())
            .filter(s => s !== "");

        res.json({ 
            success: true 
        });
    } else {
        res.status(404).json({ 
            success: false 
        });
    }
});

app.get('/api/users/:current', (req, res) => {
    res.json(
        db.users.filter(u => 
            u.name.toLowerCase() !== req.params.current.toLowerCase()
        )
    );
});

app.post('/api/send-request', (req, res) => {
    const { from, to } = req.body;

    const existingRequest = db.requests.find(r => 
        r.from.toLowerCase() === from.toLowerCase() &&
        r.to.toLowerCase() === to.toLowerCase()
    );

    if (!existingRequest) {
        db.requests.push({ 
            from, 
            to, 
            status: 'pending' 
        });
    }

    io.to(to.toLowerCase()).emit('new-request', { 
        from 
    });

    res.json({ 
        success: true 
    });
});

app.post('/api/accept-request', (req, res) => {
    const { from, to } = req.body;

    const request = db.requests.find(r => 
        r.from.toLowerCase() === from.toLowerCase() &&
        r.to.toLowerCase() === to.toLowerCase() &&
        r.status === 'pending'
    );

    if (request) {
        request.status = 'accepted';

        io.to(from.toLowerCase()).emit('request-accepted', { 
            by: to 
        });

        res.json({ 
            success: true 
        });
    } else {
        res.json({ 
            success: false 
        });
    }
});

app.get('/api/my-notifications/:name', (req, res) => {
    res.json(
        db.requests.filter(r => 
            r.to.toLowerCase() === req.params.name.toLowerCase() &&
            r.status === 'pending'
        )
    );
});

app.get('/api/my-connections/:name', (req, res) => {
    const name = req.params.name.toLowerCase();

    const partners = db.requests
        .filter(r => 
            (r.from.toLowerCase() === name || r.to.toLowerCase() === name) &&
            r.status === 'accepted'
        )
        .map(r => 
            r.from.toLowerCase() === name ? r.to : r.from
        );

    res.json([...new Set(partners)]);
});

app.get('/api/chat-history/:u1/:u2', (req, res) => {
    const { u1, u2 } = req.params;

    res.json(
        db.messages.filter(m => 
            (
                m.from.toLowerCase() === u1.toLowerCase() &&
                m.to.toLowerCase() === u2.toLowerCase()
            ) ||
            (
                m.from.toLowerCase() === u2.toLowerCase() &&
                m.to.toLowerCase() === u1.toLowerCase()
            )
        )
    );
});

http.listen(5000, () => {
    console.log(`Server: http://localhost:5000`);
});