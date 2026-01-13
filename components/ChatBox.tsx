import { useState, useRef, useEffect } from 'react';
import { Send, User, Ghost } from 'lucide-react';
import { EMOJI_MAP } from '../utils/emojis';

interface ChatBoxProps {
    username: string;
    messages: any[];
    onSendMessage: (text: string) => void;
    className?: string;
}

export default function ChatBox({ username, messages, onSendMessage, className = '' }: ChatBoxProps) {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // use e.code to get the physical key (Digit0...Digit9)
        if (e.code.startsWith('Digit')) {
            const digit = e.code.replace('Digit', '');

            // If Shift is pressed, standard behavior (symbols like !, @, #)
            if (e.shiftKey) {
                return;
            }

            // Check Caps Lock state
            const isCapsLockOn = e.getModifierState('CapsLock');

            if (isCapsLockOn) {
                // Caps Lock ON -> Allow default (Numbers 0-9)
                return;
            }

            // Caps Lock OFF -> Insert Emoji
            if (EMOJI_MAP[digit]) {
                e.preventDefault();

                const emoji = EMOJI_MAP[digit];

                // Insert at cursor position
                const inputEl = e.currentTarget;
                const start = inputEl.selectionStart || 0;
                const end = inputEl.selectionEnd || 0;

                const newValue = input.substring(0, start) + emoji + input.substring(end);
                setInput(newValue);

                setTimeout(() => {
                    inputEl.selectionStart = start + emoji.length;
                    inputEl.selectionEnd = start + emoji.length;
                }, 0);
            }
        }
    };

    return (
        <div className={`flex  flex-col bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-900">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Live Chat</h3>
                </div>
                {username && (
                    <div className="px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20 flex items-center gap-2">
                        <User size={12} className="text-indigo-400" />
                        <span className="text-xs text-indigo-300 font-mono">{username}</span>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-zinc-600 text-xs py-10 flex flex-col items-center gap-2">
                        <Ghost size={24} className="opacity-50" />
                        <p>Quiet room... say hello!</p>
                    </div>
                )}
                {messages.map((msg, i) => {
                    const isMe = msg.user === username;
                    return (
                        <div key={i} className={`flex flex-col ${msg.type === 'system' ? 'items-center my-2' : (isMe ? 'items-end' : 'items-start')}`}>
                            {msg.type === 'system' ? (
                                <span className="text-[10px] text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-full">{msg.text}</span>
                            ) : (
                                <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-baseline gap-2 mb-1 px-1">
                                        {!isMe && (
                                            <span className="text-xs font-bold text-zinc-400">
                                                {msg.user}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-zinc-600">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className={`text-sm px-3 py-2 rounded-xl break-words ${isMe
                                        ? 'bg-indigo-600 text-white rounded-br-sm'
                                        : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'
                                        }`}>
                                        {msg.text}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 bg-zinc-900/80 border-t border-white/5 flex gap-2">
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                />
                <button
                    type="submit"
                    disabled={!input.trim()}
                    className="p-2 bg-indigo-600 rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors text-white"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}
