import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export default function Landing() {
    const cursorRef = useRef(null)
    const cursorRingRef = useRef(null)
    const ringPos = useRef({ x: 0, y: 0 })
    const mousePos = useRef({ x: 0, y: 0 })
    const [lines, setLines] = useState([])

    // Cursor Animation
    useEffect(() => {
        const handleMouseMove = (e) => {
            mousePos.current = { x: e.clientX, y: e.clientY }
            if (cursorRef.current) {
                cursorRef.current.style.left = e.clientX + 'px'
                cursorRef.current.style.top = e.clientY + 'px'
            }
        }

        let animationFrameId
        const animateRing = () => {
            ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.12
            ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.12
            if (cursorRingRef.current) {
                cursorRingRef.current.style.left = ringPos.current.x + 'px'
                cursorRingRef.current.style.top = ringPos.current.y + 'px'
            }
            animationFrameId = requestAnimationFrame(animateRing)
        }

        window.addEventListener('mousemove', handleMouseMove)
        animateRing()

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            cancelAnimationFrame(animationFrameId)
        }
    }, [])

    // Falling Lines Animation
    useEffect(() => {
        const createLine = () => {
            const id = Math.random().toString(36).substr(2, 9)
            const x = Math.random() * 100
            const duration = 8 + Math.random() * 12
            const delay = Math.random() * 8
            const height = 60 + Math.random() * 200

            setLines(prev => [...prev, { id, x, duration, delay, height }])

            setTimeout(() => {
                setLines(prev => prev.filter(line => line.id !== id))
            }, (duration + delay) * 1000)
        }

        for (let i = 0; i < 20; i++) createLine()

        const interval = setInterval(createLine, 800)
        return () => clearInterval(interval)
    }, [])

    // Scroll Reveal
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('landing-visible')
                }
            })
        }, { threshold: 0.2 })

        document.querySelectorAll('.landing-scroll-reveal').forEach(el => observer.observe(el))

        return () => observer.disconnect()
    }, [])

    return (
        <div className="landing-wrapper w-full min-h-screen bg-[#1C1A18] text-[#F2EDE6] font-serif relative overflow-x-hidden" style={{ cursor: 'none' }}>
            <style>{`
          .landing-wrapper * { cursor: none !important; }
          .landing-wrapper { --accent: #C4A882; --cream: #F2EDE6; --charcoal: #1C1A18; --muted: #8C8479; }
          .custom-cursor { position: fixed; width: 8px; height: 8px; background: var(--accent); border-radius: 50%; pointer-events: none; z-index: 9999; transform: translate(-50%, -50%); transition: transform 0.1s ease; }
          .custom-cursor-ring { position: fixed; width: 32px; height: 32px; border: 1px solid rgba(196,168,130,0.4); border-radius: 50%; pointer-events: none; z-index: 9998; transform: translate(-50%, -50%); transition: all 0.3s ease; }
          .noise-overlay { content: ''; position: fixed; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"); pointer-events: none; z-index: 1000; opacity: 0.6; }
          
          .veil-bg { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 30% 40%, rgba(196,168,130,0.06) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 70% 60%, rgba(139,120,100,0.04) 0%, transparent 60%), linear-gradient(160deg, #1C1A18 0%, #252220 40%, #1A1816 100%); }
          .veil-line { position: absolute; width: 1px; background: linear-gradient(to bottom, transparent, rgba(196,168,130,0.2), transparent); animation: veilFloat linear infinite; opacity: 0; }
          @keyframes veilFloat { 0% { transform: translateY(-100vh); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(100vh); opacity: 0; } }
          
          .fade-up { opacity: 0; animation: fadeUpAnim 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .fade-up-d1 { animation-delay: 0.3s; }
          .fade-up-d2 { animation-delay: 0.8s; } 
          .fade-up-d3 { animation-delay: 1.1s; } 
          .fade-up-d4 { animation-delay: 1.5s; }
          @keyframes fadeUpAnim { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
          
          .btn-primary-landing { padding: 1rem 2.5rem; border: 1px solid var(--accent); background: transparent; color: var(--accent); font-family: 'Noto Sans TC', sans-serif; letter-spacing: 0.3em; text-transform: uppercase; transition: all 0.4s ease; text-decoration: none; }
          .btn-primary-landing:hover { background: var(--accent); color: var(--charcoal); }
          .btn-ghost-landing { letter-spacing: 0.2em; color: var(--muted); text-transform: uppercase; text-decoration: none; transition: color 0.3s ease; font-family: 'Noto Sans TC', sans-serif; }
          .btn-ghost-landing:hover { color: var(--cream); }
          .landing-scroll-reveal { opacity: 0; transform: translateY(20px); transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
          .landing-visible { opacity: 1; transform: translateY(0); }
          
          .scroll-line-anim { animation: scrollPulseAnim 2s ease infinite; }
          @keyframes scrollPulseAnim { 0%, 100% { opacity: 0.3; transform: scaleY(1); } 50% { opacity: 1; transform: scaleY(1.2); } }
        `}</style>

            {/* Custom cursor elements */}
            <div ref={cursorRef} className="custom-cursor hidden md:block"></div>
            <div ref={cursorRingRef} className="custom-cursor-ring hidden md:block"></div>
            <div className="noise-overlay"></div>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 py-8 px-6 md:px-12 flex justify-between items-center z-50 mix-blend-normal pointer-events-auto">
                <div className="font-serif text-[1.5rem] font-light tracking-[0.4em] text-cream uppercase">V<span className="text-accent">ei</span>l</div>
            </nav>

            {/* Hero Section */}
            <section className="relative w-screen h-screen flex items-center justify-center overflow-hidden">
                <div className="veil-bg"></div>
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {lines.map(line => (
                        <div key={line.id} className="veil-line" style={{ left: `${line.x}%`, height: `${line.height}px`, animationDuration: `${line.duration}s`, animationDelay: `${line.delay}s` }}></div>
                    ))}
                </div>

                <div className="relative text-center z-10 fade-up">
                    <p className="text-[0.65rem] tracking-[0.5em] text-accent uppercase mb-8 fade-up fade-up-d1 opacity-0 font-sans">A Private Fashion Community</p>
                    <h1 className="text-[clamp(4rem,10vw,8rem)] font-serif font-light leading-[0.9] tracking-[0.15em] text-cream uppercase mb-1 opacity-0 fade-up" style={{ animationDelay: '0.5s' }}>
                        Veil
                    </h1>
                    <p className="mt-10 text-[1.4rem] font-light tracking-[0.3em] text-cream font-sans opacity-0 fade-up fade-up-d2">
                        品味，<strong className="text-cream font-medium">在這裡被看見</strong>
                    </p>
                    <div className="mt-16 flex flex-col md:flex-row gap-6 justify-center items-center opacity-0 fade-up fade-up-d3 relative z-50">
                        <Link to="/auth" className="btn-primary-landing text-[1.2rem] font-sans px-14 py-5 tracking-[0.25em]">加入社群</Link>
                        <div className="hidden md:block w-[1px] h-[20px] bg-muted opacity-40 rotate-[20deg]"></div>
                        <button
                            onClick={() => document.getElementById('about').scrollIntoView({ behavior: 'smooth' })}
                            className="btn-ghost-landing text-[1.2rem] font-sans tracking-[0.25em]"
                        >
                            了解更多
                        </button>
                    </div>
                </div>

                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-0 fade-up fade-up-d4">
                    <span className="text-[0.6rem] tracking-[0.3em] text-muted uppercase">Scroll</span>
                    <div className="w-[1px] h-[40px] bg-gradient-to-b from-accent to-transparent scroll-line-anim"></div>
                </div>
            </section>

            {/* Features Section - now section 2 */}
            <section id="about" className="py-[3rem] px-[3rem] md:px-[5rem] relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-[1100px] mx-auto">
                    <div className="landing-scroll-reveal">
                        <span className="text-[1rem] tracking-[0.3em] text-accent mb-6 block font-medium">01</span>
                        <div className="w-[40px] h-[1px] bg-accent opacity-60 mb-8"></div>
                        <h3 className="text-[2rem] font-sans font-light text-cream mb-5 leading-[1.3]">展示您的品味</h3>
                        <p className="text-[1rem] leading-[1.8] text-[#C8C0B4] font-sans font-light">建立專屬作品，讓懂的人找到您。每一件衣物，都是您風格的延伸。</p>
                    </div>
                    <div className="landing-scroll-reveal" style={{ transitionDelay: '0.15s' }}>
                        <span className="text-[1rem] tracking-[0.3em] text-accent mb-6 block font-medium">02</span>
                        <div className="w-[40px] h-[1px] bg-accent opacity-60 mb-8"></div>
                        <h3 className="text-[2rem] font-sans font-light text-cream mb-5 leading-[1.3]">開設限時專區</h3>
                        <p className="text-[1rem] leading-[1.8] text-[#C8C0B4] font-sans font-light">在時效內開放申請，由您決定誰能進入。交易在信任的基礎上流動。</p>
                    </div>
                    <div className="landing-scroll-reveal" style={{ transitionDelay: '0.3s' }}>
                        <span className="text-[1rem] tracking-[0.3em] text-accent mb-6 block font-medium">03</span>
                        <div className="w-[40px] h-[1px] bg-accent opacity-60 mb-8"></div>
                        <h3 className="text-[2rem] font-sans font-light text-cream mb-5 leading-[1.3]">建立信用關係</h3>
                        <p className="text-[1rem] leading-[1.8] text-[#C8C0B4] font-sans font-light">每次交易後的評價，累積成你在社群中的信用。品味與誠信，缺一不可。</p>
                    </div>
                    <div className="landing-scroll-reveal" style={{ transitionDelay: '0.45s' }}>
                        <span className="text-[1rem] tracking-[0.3em] text-accent mb-6 block font-medium">04</span>
                        <div className="w-[40px] h-[1px] bg-accent opacity-60 mb-8"></div>
                        <h3 className="text-[2rem] font-sans font-light text-cream mb-5 leading-[1.3]">實名驗證保障</h3>
                        <p className="text-[1rem] leading-[1.8] text-[#C8C0B4] font-sans font-light">透過社群平台或簡訊完成真人驗證，獲得認證標章，讓每一筆交易都更安心。</p>
                    </div>
                </div>
            </section>

            {/* Manifesto Section - now section 3 */}
            <section className="py-[4rem] px-[2rem] md:px-[6rem] bg-gradient-to-b from-transparent via-[rgba(196,168,130,0.03)] to-transparent text-center relative overflow-hidden flex items-center justify-center z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30vw] font-light text-[rgba(196,168,130,0.03)] tracking-[0.2em] pointer-events-none font-serif select-none z-0 leading-none">
                    VEIL
                </div>
                <p className="landing-scroll-reveal text-[clamp(1.5rem,3vw,2.5rem)] font-light leading-[1.7] text-cream max-w-[800px] mx-auto font-sans relative z-10">
                    不是每件衣物都有故事<br />
                    但<em className="text-accent not-italic">穿過</em>，都帶著溫度<br />
                    在 Veil，懂的人<em className="text-accent not-italic">自然會來</em>
                </p>
            </section>

            {/* Footer */}
            <footer className="py-[1.5rem] px-[2rem] md:px-[6rem] border-t border-[rgba(196,168,130,0.1)] flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                <div className="text-[1.2rem] tracking-[0.5em] text-muted uppercase font-light">Veil</div>
                <div className="text-[0.65rem] tracking-[0.2em] text-[rgba(140,132,121,0.5)] uppercase">© 2026 Veil. All rights reserved.</div>
            </footer>
        </div>
    )
}
