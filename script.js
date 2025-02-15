let questions = [];
let learnedQuestions = [];
let progress = {};
let currentQuestionIndex = 0;
let highestscore = 0;
let userName = '';
let selectedOptions = [];
let isMuted = false;
let level = 2;
let lifelines = 5
let currentScore = 0
let call = 'randomWords';
let randomWords;
let urlParams;
const audio = new Audio('correct.mp3');
let voiceName = null;



function loadQuestions() {

    urlParams = new URLSearchParams(window.location.search);

    if (!urlParams.get('level') || !urlParams.get('username')) {
        window.location.href = 'start.html';
    }
    level = urlParams.get('level');

    fetch(level + '_data.json')
        .then(response => response.json())
        .then(data => {
            questions = data;
            startGame();
            loadProgress();
            removeLearnedQuestions();
        })
        .catch(error => console.error('Error loading JSON:', error));

    loadRandomWords(level);
}

function removeLearnedQuestions() {

    learnedQuestions.forEach((element) => {
        let index = questions.findIndex(q => q.question === element);
        questions.splice(index, 1);
    });

}

function loadRandomWords(level) {

    if (level == 1) {
        randomWords = randomWords_1;
    } else if (level = 2) {
        randomWords = randomWords_2;
    }
}

function loadProgress() {
    const storedProgress = JSON.parse(localStorage.getItem('progress')) || {};
    const storedLearnedQuestions = JSON.parse(localStorage.getItem('learnedQuestions')) || {};
    progress = storedProgress[userName + '_' + level] || {};
    learnedQuestions = storedLearnedQuestions[userName + '_' + level] || [];
}

function saveProgress() {
    const storedProgress = JSON.parse(localStorage.getItem('progress')) || {};
    const storedLearnedQuestions = JSON.parse(localStorage.getItem('learnedQuestions')) || {};
    storedProgress[userName + '_' + level] = progress;
    storedLearnedQuestions[userName + '_' + level] = learnedQuestions;
    localStorage.setItem('progress', JSON.stringify(storedProgress));
    localStorage.setItem('learnedQuestions', JSON.stringify(storedLearnedQuestions));
}

function startGame() {


    userName = urlParams.get('username');
    level = urlParams.get('level');
    if (userName) {
        document.getElementById('user-greeting').innerText = `Hello, ${userName}!  You are on level : ${level}`;
        shuffleArray(questions); // Shuffle questions at the start of the game  
        questions = questions.filter(q => !learnedQuestions.includes(q.question));
        loadQuestion();
        loadScore();
    } else {
        alert('Username not found. Please go back and enter your name.');
    }
}

function resetQuestions() {
    learnedQuestions = [];
    saveProgress();

}

function loadQuestion() {
    if (questions.length === 0) {
        alert('You have learned all the questions!');
        resetQuestions();

        return;
    }

    const question = questions[currentQuestionIndex];
    console.log(questions.length);
    console.log(question.question)
    const questionDiv = document.getElementById('question');
    questionDiv.innerHTML = question.question;


    const optionsDiv = document.getElementById('options');
    const selectedOptionsDiv = document.getElementById('selected-options');
    optionsDiv.innerHTML = '';
    selectedOptionsDiv.innerHTML = '';
    selectedOptions = [];

    // Add random words to the options
    const optionsWithRandomWords = [...question.options];
    while (optionsWithRandomWords.length < question.options.length + 5) {
        const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];
        if (!optionsWithRandomWords.includes(randomWord)) {
            optionsWithRandomWords.push(randomWord);
        }
    }

    shuffleArray(optionsWithRandomWords).forEach(option => {
        const button = document.createElement('button');
        button.innerText = option;
        button.onclick = () => selectOption(button);
        optionsDiv.appendChild(button);
    });

    if (!isMuted) {
        speakQuestion(question.phrase);
    }
    const answerDiv = document.getElementById('answer');
    answerDiv.innerHTML = question.answer;
    answerDiv.classList.remove('revealed');
}


function selectOption(button) {
    const optionText = button.innerText;
    speakQuestion(optionText);
    const selectedOptionsDiv = document.getElementById('selected-options');
    const optionsDiv = document.getElementById('options');
    if (selectedOptions.includes(optionText)) {
        selectedOptions = selectedOptions.filter(opt => opt !== optionText);
        button.classList.remove('selected');
        const selectedButton = Array.from(selectedOptionsDiv.children).find(btn => btn.innerText === optionText);
        selectedOptionsDiv.removeChild(selectedButton);
        const newButton = document.createElement('button');
        newButton.innerText = optionText;
        newButton.onclick = () => selectOption(newButton);
        optionsDiv.appendChild(newButton);
    } else {
        selectedOptions.push(optionText);
        button.classList.add('selected');
        const selectedButton = document.createElement('button');
        selectedButton.innerText = optionText;
        selectedButton.classList.add('move-up');
        selectedButton.onclick = () => deselectOption(selectedButton);
        selectedOptionsDiv.appendChild(selectedButton);
        setTimeout(() => {
            button.style.display = 'none';
        }, 500); // Match the animation duration
    }
}

function deselectOption(button) {
    const optionText = button.innerText;
    const optionsDiv = document.getElementById('options');
    selectedOptions = selectedOptions.filter(opt => opt !== optionText);
    button.remove();
    const newButton = document.createElement('button');
    newButton.innerText = optionText;
    newButton.onclick = () => selectOption(newButton);
    optionsDiv.appendChild(newButton);
}

function checkAnswer() {
    const question = questions[currentQuestionIndex];
    const correctAnswer = question.options;
    if (JSON.stringify(selectedOptions) === JSON.stringify(correctAnswer)) {
        if (!isMuted) {
            audio.play();
        }
        currentScore++;
        progress[question.question] = (progress[question.question] || 0) + 1;
        if (progress[question.question] >= 1) {
            learnedQuestions.push(question.question);
            questions.splice(currentQuestionIndex, 1);
        }
        
        saveProgress();
        saveScore();
        showFeedback(true);
    } else {
        lifelines--;
        if (lifelines == 0) {
            if (currentScore > highestscore) {
                highestscore = currentScore;
                saveScore();
            }
            currentScore = 0;
            lifelines = 5;

        }
        
        showFeedback(false);
    }
    speakQuestion(question.answer);
    currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
    loadScore();
    loadQuestion();
}

function showFeedback(isCorrect) {
    const feedbackDiv = document.getElementById('feedback');
    feedbackDiv.style.display = 'block';
    feedbackDiv.innerHTML = isCorrect ? '<span class="tick">&#10004;</span>' : '<span class="cross">&#10008;</span>';
    setTimeout(() => {
        feedbackDiv.style.display = 'none';
    }, 1500);
}

function loadScore() {
    const scores = JSON.parse(localStorage.getItem('scores')) || {};
    highestscore = scores[userName + '_' + level] || 0;
    updateScoreboard();
}

function saveScore() {
    const scores = JSON.parse(localStorage.getItem('scores')) || {};
    scores[userName + '_' + level] = highestscore;
    localStorage.setItem('scores', JSON.stringify(scores));
    updateScoreboard();
}

function updateScoreboard() {
    document.getElementById('scoreboard').innerText = `Highest Score: ${highestscore}`;
    document.getElementById('currentscore').innerText = `Current Score: ${currentScore}`;
    document.getElementById('lifelines').innerText = `Lifelines : ${lifelines}`;
    document.getElementById('remainingQuestions').innerText = `Questions remaining : ${questions.length} `;
}

function speakQuestion(text) {
    if (!isMuted) {
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.pitch = 1;
        utterance.voice = voiceName;
        utterance.rate = 0.7; // Adjust the rate (0.1 to 10, where 1 is the default rate)
        speechSynthesis.speak(utterance);
    }
}

function toggleMute() {
    isMuted = !isMuted;
    document.getElementById('mute-button').innerText = isMuted ? 'Unmute' : 'Mute';
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getVoice() {
    window.speechSynthesis.onvoiceschanged = function() {
        voices = window.speechSynthesis.getVoices();
        for (let i = 0; i < voices.length; i++) {
            //if (voices[i].name.includes('Pablo')) {
            if (voices[i].name.includes('Helen')) {
                voiceName = voices[i];
                break;
            }
        }
    };
}
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('mute-button').innerText = isMuted ? 'Unmute' : 'Mute';
    checkSession()
    loadQuestions()
    getVoice();
});
document.getElementById('answer').addEventListener('click', function() {
    speakQuestion(this.innerHTML)
    this.classList.toggle('revealed');
});

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        username: params.get('username'),
        // Add other required query parameters here
    };
}

// Check session
function checkSession() {
    const lastVisit = sessionStorage.getItem('lastVisit');
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000; // One day in milliseconds

    if (lastVisit ===null || (lastVisit && (now - lastVisit > oneDay))) {
        // Redirect to start.html if the last visit was more than a day ago
        window.location.href = 'start.html';
    } else {
        // Update the last visit time
        sessionStorage.setItem('lastVisit', now);
    }
}
