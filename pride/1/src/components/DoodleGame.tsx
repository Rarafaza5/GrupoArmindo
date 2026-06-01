import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../lib/GameEngine';
import { PRIDE_COLORS } from '../lib/constants';
import { audio } from '../lib/audio';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Maximize, Minimize } from 'lucide-react';

interface DoodleGameProps {
  onClose: () => void;
}

export default function DoodleGame({ onClose }: DoodleGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [hasStarted, setHasStarted] = useState(false);
  const [collected, setCollected] = useState<string[]>([]);
  const [dialogue, setDialogue] = useState<{ text: string; color: string } | null>(null);
  const [won, setWon] = useState(false);
  const [stats, setStats] = useState({ level: 1, xp: 0, maxXp: 100, coins: 0, hp: 100, maxHp: 100 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Joystick state
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isDraggingJoystick, setIsDraggingJoystick] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Wait a tick for layout shift then resize canvas
      setTimeout(() => {
        if (canvasRef.current && containerRef.current) {
          canvasRef.current.width = containerRef.current.clientWidth;
          canvasRef.current.height = containerRef.current.clientHeight;
        }
      }, 50);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!hasStarted || !canvasRef.current || !containerRef.current) return;

    // Initialize Canvas sizing
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Initialize Game Engine
    engineRef.current = new GameEngine(canvasRef.current, {
      onCollect: (colorId) => {
        setCollected((prev) => [...prev, colorId]);
      },
      onDialogue: (text, color) => {
        setDialogue({ text, color });
      },
      onCloseDialogue: () => {
        setDialogue(null);
      },
      onWin: () => {
        setWon(true);
      },
      onStatsChange: (newStats) => {
        setStats(newStats);
      }
    });

    engineRef.current.start();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (engineRef.current) {
        engineRef.current.unbindEvents();
        engineRef.current.stop();
      }
      audio.stopMusic();
    };
  }, [hasStarted]);

  const handleStart = () => {
    audio.init();
    audio.startMusic();
    setHasStarted(true);
  };

  // Joystick Handlers
  const maxJoystickDist = 50;

  const handleJoystickMove = useCallback((clientX: number, clientY: number) => {
    if (!joystickBaseRef.current || !engineRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const basePathX = rect.left + rect.width / 2;
    const basePathY = rect.top + rect.height / 2;
    
    let dx = clientX - basePathX;
    let dy = clientY - basePathY;
    
    const dist = Math.hypot(dx, dy);
    if (dist > maxJoystickDist) {
      dx = (dx / dist) * maxJoystickDist;
      dy = (dy / dist) * maxJoystickDist;
    }
    
    setJoystickPos({ x: dx, y: dy });
    engineRef.current.setJoystick(dx / maxJoystickDist, dy / maxJoystickDist);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    setIsDraggingJoystick(true);
    handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY);
  };
  
  const onTouchMove = (e: React.TouchEvent) => {
    if (isDraggingJoystick) {
      handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  
  const onTouchEnd = () => {
    setIsDraggingJoystick(false);
    setJoystickPos({ x: 0, y: 0 });
    if (engineRef.current) {
      engineRef.current.setJoystick(0, 0);
    }
  };

  const handleActionClick = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (engineRef.current) {
      engineRef.current.triggerAction();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center overflow-hidden font-sans"
      ref={containerRef}
    >
      <div className="absolute top-4 right-4 z-50 flex gap-4">
        {hasStarted && (
          <button 
            onClick={toggleFullscreen}
            className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full text-white transition-colors"
          >
            {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
          </button>
        )}
        <button 
          onClick={onClose}
          className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {!hasStarted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-gray-900/80 backdrop-blur-sm p-4 sm:p-6 text-center overflow-y-auto">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl md:text-5xl lg:text-7xl font-black mb-6 tracking-tight flex flex-wrap justify-center gap-[2px] mt-16 sm:mt-0"
          >
            {'GRUPO ARMINDO'.split('').map((char, i) => (
               <span key={i} style={{ color: char === ' ' ? 'transparent' : PRIDE_COLORS[i % PRIDE_COLORS.length].hex }}>
                 {char === ' ' ? '\u00A0' : char}
               </span>
            ))}
          </motion.div>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="max-w-xl w-full bg-gray-800 p-6 sm:p-8 rounded-3xl border border-gray-700 shadow-2xl"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-purple-600 mb-4 font-black">
              FESTIVAL DO ORGULHO LGBTQIA+ 🏳️‍🌈🏳️‍⚧️
            </h2>
            <p className="text-gray-300 mb-8 text-sm sm:text-base md:text-lg leading-relaxed">
              As cores do nosso desfile se espalharam pela ilha e as forças da <b>Intolerância e Preconceito</b> (mentes cinzentas) estão tentando silenciar a nossa comunidade. 
              Ao coletar a primeira cor, você despertará seu <b>Poder Prismático</b>. Colete cores, suba de nível, derrote a opressão com amor e celebre o Orgulho com o Grupo Armindo!
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6 sm:gap-8 mb-8 text-gray-400 text-sm font-mono">
              <div className="flex flex-col items-center">
                <div className="flex gap-1 mb-2">
                  <span className="hidden sm:inline-flex gap-1">
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-white">W/A/S/D</kbd>
                  </span>
                  <span className="sm:hidden">
                    <kbd className="px-3 py-1 bg-gray-700 rounded text-white">Joystick (Toque)</kbd>
                  </span>
                </div>
                <span>Mover</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="mb-2">
                  <span className="hidden sm:inline-block">
                    <kbd className="px-4 py-1 bg-gray-700 rounded text-white">Espaço</kbd>
                  </span>
                  <span className="sm:hidden">
                    <kbd className="px-3 py-1 bg-gray-700 rounded text-white">Botão Ação</kbd>
                  </span>
                </div>
                <span>Acelerar / Continuar</span>
              </div>
            </div>
            <button 
              onClick={handleStart}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-500 via-yellow-400 to-purple-500 text-white text-xl font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl hover:shadow-purple-500/50 flex items-center justify-center gap-2"
            >
              <Play className="w-6 h-6 fill-white text-white" />
              <span>YAAAS! JOGAR 🏳️‍🌈</span>
            </button>
          </motion.div>
        </div>
      )}

      {/* Main Game Container */}
      <div className="w-full h-full relative bg-gray-950">
        <canvas ref={canvasRef} className="block w-full h-full outline-none touch-none select-none" />

        {/* UI Overlay */}
        {hasStarted && (
          <>
            <div className="absolute top-4 sm:top-8 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10 w-full px-2">
              <div className="flex gap-1.5 sm:gap-3 md:gap-4 bg-gray-900/60 p-2 sm:p-4 rounded-xl sm:rounded-2xl backdrop-blur-md border border-white/10">
                {PRIDE_COLORS.map(color => {
                  const isCollected = collected.includes(color.id);
                  return (
                    <div key={color.id} className="flex flex-col items-center gap-1 sm:gap-2">
                      <motion.div 
                        className="w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 rounded-full border-2 sm:border-4 border-gray-800 shadow-inner flex items-center justify-center transition-all duration-500"
                        style={{ 
                          backgroundColor: isCollected ? color.hex : '#1f2937',
                          boxShadow: isCollected ? `0 0 20px ${color.hex}` : 'none',
                          borderColor: isCollected ? '#ffffff' : '#374151'
                        }}
                        animate={isCollected ? { scale: [1, 1.2, 1] } : {}}
                      >
                        {isCollected && <span className="text-white drop-shadow-md text-sm sm:text-lg">✨</span>}
                      </motion.div>
                      <span className={`text-[10px] sm:text-xs font-bold ${isCollected ? 'text-white' : 'text-gray-500'} uppercase hidden lg:block`}>
                        {color.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RPG Stats HUD */}
            <div className="absolute top-4 sm:bottom-8 left-4 flex flex-col gap-2 sm:gap-4 pointer-events-none z-10 w-44 sm:w-72">
               {/* HP Bar */}
               <div className="bg-gray-900/80 backdrop-blur border border-gray-700 p-2 sm:p-4 rounded-xl sm:rounded-2xl">
                 <div className="flex justify-between text-white font-bold mb-1 sm:mb-2 text-xs sm:text-base">
                    <span>❤ HP</span>
                    <span>{Math.floor(stats.hp)} / {stats.maxHp}</span>
                 </div>
                 <div className="h-2 sm:h-4 bg-gray-800 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      className="h-full bg-red-500" 
                      animate={{ width: `${(stats.hp / stats.maxHp) * 100}%` }} 
                      transition={{ type: 'spring', bounce: 0 }}
                    />
                 </div>
               </div>

               {/* XP & Level Indicator */}
               <div className="bg-gray-900/80 backdrop-blur border border-gray-700 p-2 sm:p-4 rounded-xl sm:rounded-2xl hidden sm:block">
                 <div className="flex justify-between text-white font-bold mb-2">
                    <span className="text-yellow-400">★ Nível {stats.level}</span>
                    <span className="text-gray-400 text-sm">{stats.xp} / {stats.maxXp} XP</span>
                 </div>
                 <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
                    <motion.div 
                      className="h-full bg-yellow-400" 
                      animate={{ width: `${(stats.xp / stats.maxXp) * 100}%` }}
                      transition={{ type: 'spring', bounce: 0 }}
                    />
                 </div>
                 
                 <div className="flex items-center gap-2 text-white font-bold">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex flex-col items-center justify-center">
                       <span className="text-sm">🪙</span>
                    </div>
                    <span className="text-xl">{stats.coins}</span>
                 </div>
               </div>
            </div>

             {/* Mobile Controls Overlay */}
             <div className="absolute inset-x-0 bottom-0 z-40 sm:hidden pointer-events-none flex justify-between items-end px-4 pb-8 h-48">
               {/* Virtual Joystick Area */}
               <div 
                 className="w-28 h-28 rounded-full border-2 border-white/20 bg-white/5 backdrop-blur-sm pointer-events-auto flex items-center justify-center relative touch-none"
                 ref={joystickBaseRef}
                 onTouchStart={onTouchStart}
                 onTouchMove={onTouchMove}
                 onTouchEnd={onTouchEnd}
                 onTouchCancel={onTouchEnd}
               >
                  <div 
                    className="w-10 h-10 rounded-full bg-white/40 backdrop-blur shadow-lg pointer-events-none"
                    style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }}
                  />
               </div>

               {/* Action / Dash Button */}
               <div 
                 className="w-20 h-20 rounded-full border-2 border-white/20 bg-gradient-to-tr from-pink-500 to-purple-600 backdrop-blur-sm pointer-events-auto flex items-center justify-center active:scale-90 transition-transform touch-none shadow-[0_0_20px_rgba(236,72,153,0.5)] active:from-pink-600 active:to-purple-700 mb-4 mr-2"
                 onTouchStart={handleActionClick}
                 onMouseDown={handleActionClick}
               >
                 <span className="text-white font-bold text-sm select-none">SLAY!</span>
               </div>
            </div>
            
            {/* Compass / Tip HUD */}
            <div className="absolute bottom-8 left-8 text-white/50 text-sm font-mono bg-gray-900/50 backdrop-blur p-4 rounded-xl border border-white/10 hidden xl:block pointer-events-none">
               Dica: Colete orbes pelo mapa.<br/>
               Acumule XP para ficar fabuloso(a) e forte.<br/>
               Lute contra as sombras da Opressão!
            </div>
          </>
        )}

        {/* Dialogue Overlay */}
        <AnimatePresence>
          {dialogue && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-[20%] sm:bottom-12 left-1/2 -translate-x-1/2 w-11/12 max-w-3xl z-40"
            >
              <div 
                className="bg-gray-900 border-4 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden" 
                style={{ borderColor: dialogue.color }}
              >
                {/* Decorative glowing background blast */}
                <div 
                  className="absolute inset-0 opacity-10" 
                  style={{ background: `radial-gradient(circle at center, ${dialogue.color} 0%, transparent 70%)` }} 
                />
                
                <h4 className="text-lg sm:text-xl text-white/50 font-bold mb-2 uppercase tracking-widest text-center">COR ENCONTRADA!</h4>
                <p className="text-xl sm:text-2xl md:text-4xl text-white font-medium text-center leading-tight mb-8">
                  "{dialogue.text}"
                </p>
                <div className="flex justify-center">
                  <div className="animate-pulse bg-white/20 px-4 py-2 rounded-full text-white/70 font-mono text-sm">
                    Pressione [ESPAÇO] ou [AÇÃO] para continuar
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

         {/* Victory Screen */}
        <AnimatePresence>
          {won && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto"
            >
              {/* Confetti container */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(30)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: -50, x: Math.random() * window.innerWidth }}
                    animate={{ 
                      y: window.innerHeight + 50,
                      x: Math.random() * window.innerWidth,
                      rotate: Math.random() * 360
                    }}
                    transition={{ 
                      duration: 3 + Math.random() * 2, 
                      repeat: Infinity, 
                      delay: Math.random() * 2,
                      ease: "linear"
                    }}
                    className="absolute text-2xl sm:text-4xl shadow-lg"
                    style={{ color: PRIDE_COLORS[Math.floor(Math.random() * PRIDE_COLORS.length)].hex }}
                  >
                    {['🌸', '✨', '🌈', '🏳️‍🌈', '🏳️‍⚧️', '💖', '🦄'][Math.floor(Math.random() * 7)]}
                  </motion.div>
                ))}
              </div>

              <div className="bg-gray-900 p-6 sm:p-12 rounded-[2rem] sm:rounded-[3rem] text-center max-w-2xl w-full border border-gray-700 shadow-[0_0_100px_rgba(255,255,255,0.1)] relative overflow-hidden my-auto">
                 
                 {/* Rainbow background sweeps */}
                 <motion.div 
                   animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                   transition={{ duration: 5, ease: "linear", repeat: Infinity }}
                   className="absolute inset-0 opacity-20 -z-10"
                   style={{ 
                     background: `linear-gradient(90deg, ${PRIDE_COLORS.map(c=>c.hex).join(', ')})`,
                     backgroundSize: '200% 200%' 
                   }}
                 />

                 <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#E40303] via-[#008026] to-[#732982] mb-4 sm:mb-6 leading-tight">
                    FELIZ MÊS DO ORGULHO!
                 </h2>
                 <p className="text-base sm:text-xl text-gray-300 mb-8 sm:mb-10 leading-relaxed font-medium">
                    Você uniu todas as cores, derrotou as sombras da opressão e trouxe a celebração para a ilha! Obrigado por espalhar amor, diversidade e muito orgulho com o <b>Grupo Armindo</b>!
                 </p>
                 
                 <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                   <button 
                    onClick={() => setWon(false)}
                    className="w-full sm:w-auto px-8 py-4 sm:px-10 sm:py-5 bg-white text-black text-lg sm:text-xl font-bold rounded-full hover:scale-105 active:scale-95 transition-transform"
                   >
                     Continuar Explorando
                   </button>
                   <button 
                    onClick={onClose}
                    className="w-full sm:w-auto px-8 py-4 sm:px-10 sm:py-3 bg-transparent border-2 border-gray-600 text-gray-300 text-lg sm:text-xl font-bold rounded-full hover:bg-gray-800 transition-colors"
                   >
                     Sair do Jogo
                   </button>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

