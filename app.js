// app.js

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
const port = 3000;

// MongoDB setup
mongoose.connect('mongodb+srv://nipanepratik12:nipanepratik12@cluster0.al4m04w.mongodb.net/quizapp19?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Define Quiz and User models
const quizSchema = new mongoose.Schema({
    topic: String,
    questions: [{
        question: String,
        choices: [String],
        answer: String
    }]
});

const userSchema = new mongoose.Schema({
    username: String,
    score: Number,
    isAdmin: Boolean
});

const Quiz = mongoose.model('Quiz', quizSchema);
const User = mongoose.model('User', userSchema);

app.set('view engine', 'ejs');
app.use(session({ secret: 'your-secret-key', resave: false, saveUninitialized: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to check if the user is authenticated
const authenticateUser = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// Middleware to check if the user is an admin
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.isAdmin) {
        return next();
    }
    res.redirect('/login');
};

// Routes

// User routes
app.get('/', authenticateUser, async (req, res) => {
    const quizzes = await Quiz.find();
    res.render('index', { quizzes, user: req.session.user });
});

app.get('/quiz/:id', authenticateUser, async (req, res) => {
    const quizId = req.params.id;
    const quiz = await Quiz.findById(quizId);
    res.render('quiz', { quiz });
});

app.post('/quiz/:id/submit', authenticateUser, async (req, res) => {
    const quizId = req.params.id;
    const userAnswers = Object.values(req.body);
    const quiz = await Quiz.findById(quizId);
    const score = calculateScore(quiz.questions, userAnswers);

    // Save user score to MongoDB
    const username = req.session.user.username;
    await User.findOneAndUpdate({ username }, { score }, { upsert: true });

    res.render('result', { score, totalQuestions: quiz.questions.length });
});


// Admin routes
app.get('/admin', isAdmin, async (req, res) => {
    try {
        const allQuizzes = await Quiz.find();
        res.render('admin', { allQuizzes });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin/add', isAdmin, (req, res) => {
    res.render('add-quiz', { error: '' });
});

app.post('/admin/add', isAdmin, async (req, res) => {
    const newQuizData = req.body;
    const newQuiz = new Quiz(newQuizData);

    try {
        await newQuiz.save();
        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        res.render('add-quiz', { error: 'Failed to add the quiz. Please check your input.' });
    }
});

// ... (existing code)

// Admin login route
app.get('/admin/login', (req, res) => {
    res.render('admin-login', { error: '' });
});

// ... (existing code)

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});







// Admin routes
app.get('/admin', isAdmin, async (req, res) => {
    const allQuizzes = await Quiz.find();
    res.render('admin', { allQuizzes });
});

app.get('/admin/add', isAdmin, (req, res) => {
    res.render('add-quiz', { error: '' });
});

app.post('/admin/add', isAdmin, async (req, res) => {
    const newQuizData = req.body;
    const newQuiz = new Quiz(newQuizData);

    try {
        await newQuiz.save();
        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        res.render('add-quiz', { error: 'Failed to add the quiz. Please check your input.' });
    }
});

app.get('/admin/edit/:id', isAdmin, async (req, res) => {
    const quizId = req.params.id;

    try {
        const quiz = await Quiz.findById(quizId);
        res.render('edit-quiz', { quiz });
    } catch (error) {
        console.error(error);
        res.redirect('/admin');
    }
});

app.post('/admin/edit/:id', isAdmin, async (req, res) => {
    const quizId = req.params.id;
    const updatedQuizData = req.body;

    try {
        await Quiz.findByIdAndUpdate(quizId, updatedQuizData);
        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        res.redirect('/admin');
    }
});

app.get('/admin/delete/:id', isAdmin, async (req, res) => {
    const quizId = req.params.id;

    try {
        await Quiz.findByIdAndRemove(quizId);
        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        res.redirect('/admin');
    }
});

// Admin login route
app.get('/admin/login', (req, res) => {
    res.render('admin-login', { error: '' });
});

app.post('/admin/login', async (req, res) => {
    const { username } = req.body;

    // Check if the provided username is the admin username
    if (username === 'pratik12') {
        // In a real application, you'd perform authentication against your database.
        // For simplicity, I'm using a hardcoded value for demonstration purposes.
        req.session.user = { username, isAdmin: true };
        res.redirect('/admin');
    } else {
        res.render('admin-login', { error: 'Invalid credentials or not an admin.' });
    }
});

// User login route
app.get('/user/login', (req, res) => {
    res.render('user-login', { error: '' });
});

app.post('/user/login', async (req, res) => {
    const { username } = req.body;

    // Check if the provided username is the user username
    if (username === 'pratik') {
        // In a real application, you'd perform authentication against your database.
        // For simplicity, I'm using a hardcoded value for demonstration purposes.
        req.session.user = { username, isAdmin: false };
        res.redirect('/');
    } else {
        res.render('user-login', { error: 'Invalid credentials or not a user.' });
    }
});

// Main login route
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { username } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
        await User.create({ username, score: 0, isAdmin: false });
    }

    res.redirect('/');
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

function calculateScore(correctAnswers, userAnswers) {
    let score = 0;
    for (let i = 0; i < correctAnswers.length; i++) {
        if (correctAnswers[i].answer.toLowerCase() === userAnswers[i].toLowerCase()) {
            score++;
        }
    }
    return score;
}

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
