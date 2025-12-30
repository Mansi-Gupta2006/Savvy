import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

function Hyperspeed() {
    const containerRef = useRef(null);
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 1, 1000); 
        camera.position.z = 1;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        container.appendChild(renderer.domElement);
        const starGeo = new THREE.BufferGeometry();
        const starCoords = [];
        for (let i = 0; i < 6000; i++) {
            starCoords.push(Math.random() * 600 - 300, Math.random() * 600 - 300, Math.random() * 600 - 300);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
        let starMaterial = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.7 });
        const stars = new THREE.Points(starGeo, starMaterial);
        scene.add(stars);
        let rafId;
        function animate() {
            rafId = requestAnimationFrame(animate);
            const canvas = renderer.domElement;
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (canvas.width !== width || canvas.height !== height) {
                renderer.setSize(width, height, false);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            }
            const positions = starGeo.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 2] += 0.5;
                if (positions[i + 2] > 200) positions[i + 2] = -200;
            }
            starGeo.attributes.position.needsUpdate = true;
            renderer.render(scene, camera);
        }
        animate();
        return () => {
            cancelAnimationFrame(rafId);
            if (renderer.domElement && container.contains(renderer.domElement)) {
              container.removeChild(renderer.domElement);
            }
        };
    }, []);
    return <div ref={containerRef} className="animation-canvas" />;
}

function App() {
    const [activePage, setActivePage] = useState('challenge');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [backgroundImage, setBackgroundImage] = useState('url("/fin.jpg")');
    const [totalMoney, setTotalMoney] = useState(100.00);
    const [month, setMonth] = useState(1);
    const [sliders, setSliders] = useState({ savings: 30, investing: 20, expenses: 50 });
    const [showSummary, setShowSummary] = useState(false);
    const [summaryData, setSummaryData] = useState({});
    const initialQuestions = [
        "What is compound interest?",
        "How do I start investing?",
        "What's a good way to save money?",
        "Explain what a stock is.",
        "How does a credit score work?"
    ];
    const [chatMessages, setChatMessages] = useState([
        { sender: 'finn', text: "Hello! I'm SAVVY. Ask me anything about money!" }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [streak, setStreak] = useState(0);

    const chatContainerRef = useRef(null);
    const recognitionRef = useRef(null);
    
    useEffect(() => {
        const today = new Date().toDateString();
        let storedStreak = JSON.parse(localStorage.getItem('savvyStreak')) || { count: 0, date: '' };
        if (storedStreak.date !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            storedStreak.count = (storedStreak.date === yesterday.toDateString()) ? storedStreak.count + 1 : 1;
            storedStreak.date = today;
            localStorage.setItem('savvyStreak', JSON.stringify(storedStreak));
        }
        setStreak(storedStreak.count);
    }, []);
    
    useEffect(() => {
        if (activePage === 'challenge') {
            setBackgroundImage('url("/fin.jpg")');
        } else if (activePage === 'learn') {
            setBackgroundImage('url("/jar.gif")');
        } else {
            setBackgroundImage('');
        }
    }, [activePage]);

    useEffect(() => {
        if (activePage === 'learn' && chatMessages.length === 1) {
            const interval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * initialQuestions.length);
                const question = `Why not ask me: "${initialQuestions[randomIndex]}"`;
                setChatMessages([{ sender: 'finn', text: question }]);
            }, 4000);
            return () => clearInterval(interval);
        }
    }, [activePage, chatMessages]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatMessages]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognitionRef.current = recognition;
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (e) => { console.error(e); setIsListening(false); };
        recognition.onresult = (e) => setUserInput(e.results[0][0].transcript);
    }, []);

    const speak = (text) => {
        if (isMuted) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    const toggleMute = () => {
        setIsMuted(prev => !prev);
        if (!isMuted) window.speechSynthesis.cancel();
    };
    const handleMicClick = () => {
        if (!recognitionRef.current) return;
        isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
    };
    const handleSendMessage = async (e) => {
        e.preventDefault();
        const query = userInput.trim();
        if (!query || isThinking) return;
        setChatMessages(prev => [...prev, { sender: 'user', text: query }]);
        setUserInput('');
        setIsThinking(true);
        try {
            const response = await fetch('http://localhost:3000/api/finn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            if (!response.ok) throw new Error('Server error');
            const result = await response.json();
            setChatMessages(prev => [...prev, { sender: 'finn', text: result.answer }]);
            speak(result.answer);
        } catch (error) {
            const errorMessage = "Oops! My circuits are buzzing. Please check if the backend server is running.";
            setChatMessages(prev => [...prev, { sender: 'finn', text: errorMessage }]);
            speak(errorMessage);
        } finally {
            setIsThinking(false);
        }
    };

    useEffect(() => {
        if (activePage === 'challenge') {
            setSliders({
                savings: parseFloat((totalMoney * 0.3).toFixed(2)),
                investing: parseFloat((totalMoney * 0.2).toFixed(2)),
                expenses: parseFloat((totalMoney * 0.5).toFixed(2)),
            });
        }
    }, [totalMoney, activePage]);
    
    const handleSliderChange = (e) => {
        const { name, value } = e.target;
        setSliders(prev => ({ ...prev, [name]: parseFloat(value) }));
    };

    const endMonthHandler = () => {
        const { savings, investing } = sliders;
        const marketReturnPercent = (Math.random() * 20 - 5) / 100;
        const investmentReturn = investing * marketReturnPercent;
        const newBaseTotal = savings + investing + investmentReturn;
        let feedback = "Good job! You're building a great habit of saving and investing.";
        setSummaryData({
            return: `${(marketReturnPercent * 100).toFixed(2)}% ($${investmentReturn.toFixed(2)})`,
            nextTotal: `$${(newBaseTotal + 100).toFixed(2)}`,
            feedback: `🤖 SAVVY's Tip: ${feedback}`
        });
        setTotalMoney(parseFloat(newBaseTotal.toFixed(2)));
        setShowSummary(true);
    };

    const nextMonthHandler = () => {
        setMonth(prev => prev + 1);
        setTotalMoney(prev => parseFloat((prev + 100).toFixed(2)));
        setShowSummary(false);
    };

    const totalAllocated = sliders.savings + sliders.investing + sliders.expenses;
    const remaining = totalMoney - totalAllocated;
    const isAllocationComplete = Math.abs(remaining) < 0.01;

    return (
        <>
            <style>{`
                :root { --sidebar-width: 260px; --accent-color: #4f46e5; --accent-light: #c7d2fe; }
                body { margin: 0; font-family: 'Inter', sans-serif; background-color: #111827; color: #f9fafb; overflow: hidden; }
                
                .app-container { position: relative; display: flex; height: 100vh; }
                
                .background-layer {
                    position: absolute;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    background-size: cover;
                    background-position: center;
                    filter: blur(8px) brightness(0.6);
                    z-index: 0;
                    transition: opacity 0.5s ease-in-out;
                }
                
                .sidebar { 
                    width: var(--sidebar-width); 
                    background-color: rgba(31, 41, 55, 0.7);
                    backdrop-filter: blur(10px);
                    padding: 2rem 1.5rem; 
                    display: flex; flex-direction: column; 
                    border-right: 1px solid #374151; 
                    z-index: 20;
                    position: absolute;
                    height: 100%;
                    transform: translateX(0);
                    transition: transform 0.3s ease-in-out;
                }
                .sidebar.closed { transform: translateX(-100%); }
                
                .logo-container { 
                    display: flex; 
                    justify-content: center; 
                    margin-bottom: 3rem; 
                    padding: 0 1rem;
                }
                .logo { 
                    height: 80px; 
                    width: auto; 
                    object-fit: contain;
                }
                .nav-btn { background: none; border: none; color: #d1d5db; font-size: 1.1rem; text-align: left; padding: 1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; margin-bottom: 0.5rem; width: 100%; display: flex; align-items: center; gap: 0.75rem; }
                .nav-btn:hover { background-color: #374151; }
                .nav-btn.active { background-color: var(--accent-color); color: white; font-weight: 600; }
                .streak-counter { 
                    margin-top: auto; 
                    margin-bottom:5rem;
                    text-align: center; 
                    font-size: 1.1rem; 
                    color: #f59e0b; 
                    background-color: rgba(245, 158, 11, 0.1); 
                    padding: 0.75rem; 
                    border-radius: 99px; 
                }
                
                .main-content { 
                    flex: 1; 
                    position: relative; 
                    overflow: hidden; 
                    width: 100%;
                }
                
                .menu-btn {
                    position: fixed;
                    top: 1.5rem;
                    left: 1.5rem;
                    z-index: 30;
                    background-color: rgba(31, 41, 55, 0.7);
                    border: 1px solid #4b5563;
                    color: white;
                    width: 48px; height: 48px;
                    border-radius: 50%;
                    font-size: 1.5rem;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.3s ease-in-out;
                    transform: ${isSidebarOpen ? `translateX(var(--sidebar-width))` : 'translateX(0)'};
                }
                .menu-btn:hover { background-color: #374151; }

                .app-page { display: none; width: 100%; height: 100%; }
                .app-page.active { display: block; }
                .page-content { position: relative; z-index: 1; padding: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; box-sizing: border-box; }
                
                /* Chat Styles */
                .chat-container { width: 100%; max-width: 900px; height: calc(100vh - 6rem); display: flex; flex-direction: column; background-color: rgba(17, 24, 39, 0.85); backdrop-filter: blur(15px); border-radius: 16px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.2); border: 1px solid #374151; }
                .chat-header { padding: 1rem 1.5rem; font-size: 1.5rem; font-weight: 700; border-bottom: 1px solid #374151; display: flex; justify-content: space-between; align-items: center; }
                .mute-btn { background: none; border: none; color: #9ca3af; font-size: 1.5rem; cursor: pointer; }
                .chat-messages { flex-grow: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
                .message { max-width: 75%; padding: 0.75rem 1.25rem; border-radius: 18px; line-height: 1.5; text-align: left; }
                .message.user { background-color: var(--accent-color); color: white; align-self: flex-end; }
                .message.finn { background-color: #374151; color: #f9fafb; align-self: flex-start; }
                .chat-input-form { display: flex; padding: 1rem; border-top: 1px solid #374151; gap: 0.5rem; }
                .chat-input { flex-grow: 1; background-color: #1f2937; border: 1px solid #4b5563; color: white; border-radius: 8px; padding: 0.75rem 1rem; font-size: 1rem; }
                .mic-btn, .send-btn { background-color: var(--accent-color); border: none; color: white; font-weight: 600; padding: 0 1.25rem; border-radius: 8px; cursor: pointer; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; }
                .mic-btn.listening { background-color: #ef4444; animation: pulse 1.5s infinite; }
                
                /* Challenge Styles */
                #challenge-content { 
                    background-color: rgba(17, 24, 39, 0.85); 
                    backdrop-filter: blur(12px); 
                    border: 1px solid #374151; 
                    padding: 2.5rem; 
                    border-radius: 16px; 
                    width: 100%; 
                    max-width: 800px;
                    height: 500px;
                    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); 
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .header-stat { font-size: 1.5rem; margin-bottom: -30px; }
                .header-stat.primary { color: var(--accent-color); }
                .stat-value { font-weight: 800; }
                .remaining-money { margin-top: 1rem; font-size: 1.1rem; color: #9ca3af; }
                .highlight { font-weight: 700; color: var(--accent-color); }
                .challenge-ui-grid { display: flex; flex-direction: column; gap: 1.25rem; width: 100%; }
                .slider-group { display: grid; grid-template-columns: 100px 1fr 80px; align-items: center; gap: 1rem; width: 100%; }
                .action-btn { background-color: var(--accent-color); color: white; border: none; padding: 1rem; font-size: 1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-weight: 600; }
                .action-btn:disabled { background-color: #4b5563; cursor: not-allowed; }
                .action-btn:hover:enabled { background-color: #4338ca; }
                
                .centered-content h2 { font-size: 3.5rem; font-weight: 800; }
                .centered-content p { font-size: 1.2rem; color: #d1d5db; max-width: 600px; }
                .animation-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; }

                /* Video Styles */
                .videos-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 2rem;
                    width: 100%;
                    max-width: 1200px;
                    margin-top: 2rem;
                }

                .video-card {
                    background-color: rgba(31, 41, 55, 0.8);
                    backdrop-filter: blur(10px);
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    transition: transform 0.3s ease;
                }

                .video-card:hover {
                    transform: translateY(-5px);
                }

                .video-card video {
                    width: 100%;
                    height: 200px;
                    object-fit: cover;
                    background-color: #000;
                }

                .video-info {
                    padding: 1.5rem;
                }

                .video-info h3 {
                    color: white;
                    margin-bottom: 0.5rem;
                    font-size: 1.25rem;
                }

                .video-info p {
                    color: #d1d5db;
                    font-size: 0.9rem;
                }

                @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
            `}</style>
            
            <div className="app-container">
                <div className="background-layer" style={{ backgroundImage: backgroundImage, opacity: backgroundImage ? 1 : 0 }}></div>
                
                <nav className={`sidebar ${!isSidebarOpen ? 'closed' : ''}`}>
                    <div className="logo-container">
                        <img src="/logo.png" alt="SAVVY Logo" className="logo" />
                    </div>
                    <button className={`nav-btn ${activePage === 'challenge' ? 'active' : ''}`} onClick={() => setActivePage('challenge')}>🚀<span>Challenge</span></button>
                    <button className={`nav-btn ${activePage === 'learn' ? 'active' : ''}`} onClick={() => setActivePage('learn')}>🧠<span>Learn</span></button>
                    <button className={`nav-btn ${activePage === 'videos' ? 'active' : ''}`} onClick={() => setActivePage('videos')}>🎬<span>Videos</span></button>
                    <div className="streak-counter">🔥 Daily Streak: {streak}</div>
                </nav>

                <main className={`main-content`}>
                    <button className="menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? '❮' : '☰'}
                    </button>

                    <section className={`app-page ${activePage === 'challenge' ? 'active' : ''}`} id="page-challenge">
                         <div className="page-content">
                            <div id="challenge-content">
                                {!showSummary ? (
                                    <div className="challenge-ui-grid">
                                        <div className="header-stat"><h1>Month <span className="stat-value">{month}</span></h1></div>
                                        <div className="header-stat primary"><h1>Total Money <span className="stat-value">${totalMoney.toFixed(2)}</span></h1></div>
                                        <p className="remaining-money">{isAllocationComplete ? "All set! 👍" : `Remaining: $${remaining.toFixed(2)}`}</p>
                                        
                                        <div className="slider-group">
                                            <label>Savings 💰</label>
                                            <input type="range" name="savings" min="0" max={totalMoney} step="0.01" value={sliders.savings} onChange={handleSliderChange} />
                                            <span>${sliders.savings.toFixed(2)}</span>
                                        </div>
                                        <div className="slider-group">
                                            <label>Investing 📈</label>
                                            <input type="range" name="investing" min="0" max={totalMoney} step="0.01" value={sliders.investing} onChange={handleSliderChange} />
                                            <span>${sliders.investing.toFixed(2)}</span>
                                        </div>
                                        <div className="slider-group">
                                            <label>Expenses 🛍️</label>
                                            <input type="range" name="expenses" min="0" max={totalMoney} step="0.01" value={sliders.expenses} onChange={handleSliderChange} />
                                            <span>${sliders.expenses.toFixed(2)}</span>
                                        </div>
                                        <button className="action-btn" onClick={endMonthHandler} disabled={!isAllocationComplete}>End Month</button>
                                    </div>
                                ) : (
                                    <div>
                                        <h2>Month {month} Summary</h2>
                                        <p>{summaryData.feedback}</p>
                                        <p>Investment Return: <span className="highlight">{summaryData.return}</span></p>
                                        <p>Next Month's Total: <span className="highlight">{summaryData.nextTotal}</span></p>
                                        <button className="action-btn" onClick={nextMonthHandler}>Start Next Month</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className={`app-page ${activePage === 'learn' ? 'active' : ''}`} id="page-learn">
                         <div className="page-content">
                              <div className="chat-container">
                                <div className="chat-header">
                                    <span>Chat with SAVVY</span>
                                    <button className="mute-btn" onClick={toggleMute}>
                                        {isMuted ? '🔇' : '🔊'}
                                    </button>
                                </div>
                                <div className="chat-messages" ref={chatContainerRef}>
                                    {chatMessages.map((msg, index) => (
                                        <div key={index} className={`message ${msg.sender}`}>
                                            {msg.text}
                                        </div>
                                    ))}
                                    {isThinking && <div className="message finn">Thinking...</div>}
                                </div>
                                <form className="chat-input-form" onSubmit={handleSendMessage}>
                                    <input 
                                        type="text" 
                                        className="chat-input" 
                                        placeholder="Type or press mic to speak..." 
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        disabled={isThinking}
                                    />
                                    <button type="button" className={`mic-btn ${isListening ? 'listening' : ''}`} onClick={handleMicClick}>🎙️</button>
                                    <button type="submit" className="send-btn" disabled={!userInput || isThinking}>➤</button>
                                </form>
                              </div>
                         </div>
                    </section>
                    
                    <section className={`app-page ${activePage === 'videos' ? 'active' : ''}`} id="page-videos">
                        <Hyperspeed />
                        <div className="page-content">
                            <h2>SAVVY Shorts</h2>
                            <p>Watch these financial literacy shorts to boost your knowledge!</p>
                            
                            <div className="videos-grid">
                                <div className="video-card">
                                    <video controls>
                                        <source src="/money.mp4" type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                    <div className="video-info">
                                        <h3>Money</h3>
                                        <p>Learn how money works</p>
                                    </div>
                                </div>
                                
                                <div className="video-card">
                                    <video controls>
                                        <source src="/needs.mp4" type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                    <div className="video-info">
                                        <h3>Needs and Wants</h3>
                                        <p>Understanding difference between Needs & Wants</p>
                                    </div>
                                </div>
                                
                                <div className="video-card">
                                    <video controls>
                                        <source src="/tri1.mp4" type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                    <div className="video-info">
                                        <h3>Compound Interest</h3>
                                        <p>Smart ways to save money effectively</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}

export default App;