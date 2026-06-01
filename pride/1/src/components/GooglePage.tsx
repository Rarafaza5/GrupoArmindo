import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Mic, Keyboard, CircleUserRound, AppWindow, Beaker, Menu } from 'lucide-react';
import DoodleGame from './DoodleGame';
import { PRIDE_COLORS } from '../lib/constants';

export default function GooglePage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans relative overflow-x-hidden">
      
      {/* Top Navigation */}
      <header className="flex justify-between items-center p-3 sm:p-4">
        <div className="flex gap-4 items-center">
          <Menu className="w-6 h-6 text-gray-600 sm:hidden block" />
          <a href="#" className="text-sm hover:underline text-gray-700 hidden sm:inline-block">Sobre</a>
          <a href="#" className="text-sm hover:underline text-gray-700 hidden sm:inline-block">Loja</a>
        </div>
        <div className="flex gap-2 sm:gap-4 items-center">
          <a href="#" className="text-sm hover:underline text-gray-700 hidden sm:inline-block">Gmail</a>
          <a href="#" className="text-sm hover:underline text-gray-700 hidden sm:inline-block">Imagens</a>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden sm:inline-block" title="Laboratórios do Google Labs">
             <Beaker className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Aplicações do Grupo Armindo">
             <AppWindow className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-1 rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-colors ml-1 sm:ml-2">
             <CircleUserRound className="w-7 h-7 sm:w-8 sm:h-8" />
          </button>
        </div>
      </header>

      {/* Main Content (Centered) */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-3xl mx-auto -mt-10 sm:-mt-20">
        
        {/* Doodle Logo Container */}
        <div className="w-full flex justify-center mb-6 sm:mb-8 relative group">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="relative cursor-pointer w-full max-w-[450px]"
            onClick={() => setIsPlaying(true)}
          >
            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
               <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
               </div>
            </div>

            {/* Static Doodle Preview Image (generated via CSS) */}
            <div className="w-full aspect-[5/2] sm:h-[180px] bg-gray-100 rounded-2xl sm:rounded-3xl overflow-hidden border-2 sm:border-4 border-gray-200 relative flex items-center justify-center shadow-inner">
               {/* Background stripes */}
               <div className="absolute inset-0 opacity-10 flex">
                   {PRIDE_COLORS.map(c => <div key={c.id} className="h-full flex-1" style={{ backgroundColor: c.hex }} />)}
               </div>
               
               {/* Logo text */}
               <div className="z-10 flex font-black text-3xl sm:text-6xl tracking-tighter mix-blend-multiply">
                 {'ARMINDO'.split('').map((char, i) => (
                    <span key={i} style={{ color: PRIDE_COLORS[i % PRIDE_COLORS.length].hex, textShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      {char}
                    </span>
                 ))}
               </div>
               
               {/* Decorative little characters */}
               <div className="absolute bottom-2 right-4 text-xl sm:text-2xl animate-bounce">🏃🏽‍♀️</div>
               <div className="absolute top-4 left-6 text-xl sm:text-2xl">✨</div>
            </div>
            
            <div className="absolute -bottom-6 w-full text-center text-xs sm:text-sm text-gray-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity font-medium">
               Clique para jogar: Festival do Orgulho do Grupo Armindo!
            </div>
          </motion.div>
        </div>

        {/* Search Bar */}
        <div className="w-full relative mt-6 sm:mt-4">
          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 sm:pl-12 pr-12 sm:pr-14 py-3 sm:py-4 border border-gray-200 rounded-full text-sm sm:text-base focus:ring-1 focus:ring-gray-300 focus:border-transparent hover:shadow-md focus:shadow-md transition-shadow outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center gap-2 sm:gap-3">
             <button className="text-gray-500 hover:text-gray-700 hidden sm:block"><Keyboard className="h-4 w-4 sm:h-5 sm:w-5" /></button>
             <button className="text-blue-500 hover:text-blue-600">
               <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
             </button>
             <button className="text-blue-500 hover:text-blue-600">
               <svg focusable="false" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5"><path fill="currentColor" d="m12 15c1.66 0 3-1.31 3-2.97v-7.02c0-1.66-1.34-3.01-3-3.01s-3 1.34-3 3.01v7.02c0 1.66 1.34 2.97 3 2.97z"></path><path fill="#4285f4" d="m11 18.08h2v3.92h-2z"></path><path fill="#fbbc05" d="m7.05 16.87c-1.27-1.33-2.05-2.83-2.05-4.87h2c0 1.45 0.56 2.42 1.47 3.38v0.32l-1.15 1.18z"></path><path fill="#ea4335" d="m12 16.93a4.97 5.25 0 0 1 -3.54 -1.55l-1.41 1.49c1.26 1.34 3.02 2.13 4.95 2.13 3.87 0 6.99-2.92 6.99-7h-1.99c0 2.92-2.24 4.93-5 4.93z"></path></svg>
             </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row gap-2 sm:gap-3 justify-center mt-6 sm:mt-8">
          <button className="px-4 shrink-0 sm:px-5 py-2 sm:py-2.5 bg-[#f8f9fa] border border-[#f8f9fa] hover:border-gray-300 hover:shadow-sm rounded outline-none text-xs sm:text-sm text-gray-800 transition-all">
            Pesquisa Google
          </button>
          <button className="px-4 shrink-0 sm:px-5 py-2 sm:py-2.5 bg-[#f8f9fa] border border-[#f8f9fa] hover:border-gray-300 hover:shadow-sm rounded outline-none text-xs sm:text-sm text-gray-800 transition-all">
            Sinto-me com sorte
          </button>
        </div>

        {/* Translation Prompt */}
        <div className="mt-6 sm:mt-8 text-xs sm:text-sm text-gray-600">
           Disponibilizado em: <a href="#" className="text-blue-700 hover:underline">English</a>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#f2f2f2] text-gray-500 text-xs sm:text-sm mt-auto">
         <div className="px-4 sm:px-6 py-3 border-b border-gray-300">
            Portugal
         </div>
         <div className="flex flex-col sm:flex-row justify-between px-4 sm:px-6 py-3 gap-3 sm:gap-4">
            <div className="flex flex-wrap gap-4 sm:gap-6 justify-center sm:justify-start">
               <a href="#" className="hover:underline">Acerca de</a>
               <a href="#" className="hover:underline">Publicidade</a>
               <a href="#" className="hover:underline">Negócios</a>
               <a href="#" className="hover:underline">Como funciona a Pesquisa</a>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6 justify-center sm:justify-end">
               <a href="#" className="hover:underline">Privacidade</a>
               <a href="#" className="hover:underline">Termos</a>
               <a href="#" className="hover:underline">Definições</a>
            </div>
         </div>
      </footer>

      {/* Fullscreen Game Overlay */}
      <AnimatePresence>
        {isPlaying && <DoodleGame onClose={() => setIsPlaying(false)} />}
      </AnimatePresence>
    </div>
  );
}
