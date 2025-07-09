import { defineWebSocketHandler } from 'h3';
import WebSocket from 'ws';
import { getDeepgram } from '../utils/deepgram';
import { LiveTranscriptionEvents } from '@deepgram/sdk';

// Helper function to set up transcription mode
function setupTranscriptionMode(peer: any) {
    console.log('[deepgram] Setting up transcription-only mode...');
    const deepgram = getDeepgram();
    const connection = deepgram.listen.live({
        model: "nova-2",
        language: "en-US",
        smart_format: true,
        interim_results: true,
        punctuate: true,
        diarize: false,
        endpointing: 300,
        vad_events: true,
        utterance_end_ms: 1000,
        no_delay: true,
    });

    connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('[deepgram] Transcription connection opened for peer:', peer.id);
        peer.send(JSON.stringify({ type: 'deepgram_connected', data: 'Connected to Deepgram Transcription' }));
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        console.log('[deepgram] Transcript received:', data);
        peer.send(JSON.stringify({ type: 'transcript', data }));
    });

    connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
        console.log('[deepgram] Speech started');
        peer.send(JSON.stringify({ type: 'speech_started', data: 'Speech started' }));
    });

    connection.on(LiveTranscriptionEvents.UtteranceEnd, (data) => {
        console.log('[deepgram] Utterance end:', data);
        peer.send(JSON.stringify({ type: 'utterance_end', data }));
    });

    connection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error('[deepgram] Transcription error:', error);
        peer.send(JSON.stringify({ type: 'error', data: 'Transcription error: ' + error.message }));
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('[deepgram] Transcription connection closed for peer:', peer.id);
        peer.send(JSON.stringify({ type: 'disconnected', data: 'Transcription connection closed' }));
    });

    // Store the transcription connection
    (peer as any).deepgramConnection = connection;
    (peer as any).connectionType = 'transcription';
    
    // Send keep-alive for transcription
    const keepAliveInterval = setInterval(() => {
        try {
            if (connection.getReadyState() === 1) {
                connection.send(new ArrayBuffer(0));
            }
        } catch (error) {
            console.error('[deepgram] Error sending keep-alive:', error);
        }
    }, 30000);
    
    (peer as any).keepAliveInterval = keepAliveInterval;
}

export default defineWebSocketHandler({
    async open(peer) {
        console.log('[ws] WebSocket connection opened:', peer.id);
        
        // Send connection confirmation
        peer.send(JSON.stringify({ type: 'connected', data: 'WebSocket connected successfully' }));
        
        try {
            // Get API keys
            const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
            const openaiApiKey = process.env.OPENAI_API_KEY;
            
            console.log('[debug] Deepgram API key present:', !!deepgramApiKey);
            console.log('[debug] OpenAI API key present:', !!openaiApiKey);
            
            if (!deepgramApiKey) {
                throw new Error('DEEPGRAM_API_KEY is not set in environment variables. Please set it in your .env file.');
            }

            // Try Voice Agent API first if OpenAI key is available
            if (openaiApiKey) {
                console.log('[deepgram] Attempting Voice Agent API connection...');
                
                try {
                    const deepgramWs = new WebSocket('wss://agent.deepgram.com/v1/agent/converse', {
                        headers: {
                            'Authorization': `Token ${deepgramApiKey}`,
                        }
                    });
                    
                    console.log('[deepgram] Voice Agent WebSocket created, waiting for connection...');
                    
                    // Set up a timeout for the Voice Agent connection
                    const connectionTimeout = setTimeout(() => {
                        console.log('[deepgram] Voice Agent connection timeout, falling back to transcription...');
                        deepgramWs.close();
                    }, 10000); // 10 second timeout
                    
                    // Configure the Voice Agent
                    const config = {
                        type: "Settings",
                        audio: {
                            input: {
                                encoding: "linear16",
                                sample_rate: 16000,
                            },
                            output: {
                                encoding: "linear16",
                                sample_rate: 16000,
                                container: "none",
                            },
                        },
                        agent: {
                            language: "en",
                            listen: {
                                provider: {
                                    type: "deepgram",
                                    model: "nova-2",
                                },
                            },
                            think: {
                                provider: {
                                    type: "open_ai",
                                    model: "gpt-4o-mini",
                                    api_key: openaiApiKey,
                                },
                                prompt: "You are a helpful AI assistant. Keep your responses concise and conversational.",
                            },
                            speak: {
                                provider: {
                                    type: "deepgram",
                                    model: "aura-asteria-en",
                                },
                            },
                        },
                    };

                    // Set up Voice Agent event handlers
                    deepgramWs.on('open', () => {
                        console.log('[deepgram] Voice Agent connection opened for peer:', peer.id);
                        clearTimeout(connectionTimeout);
                        peer.send(JSON.stringify({ type: 'deepgram_connected', data: 'Connected to Deepgram Voice Agent' }));
                        
                        // Send configuration
                        console.log('[deepgram] Sending Voice Agent configuration...');
                        console.log('[deepgram] Configuration:', JSON.stringify(config, null, 2));
                        deepgramWs.send(JSON.stringify(config));
                    });

                    deepgramWs.on('message', (data: WebSocket.Data) => {
                        try {
                            if (typeof data === 'string') {
                                const message = JSON.parse(data);
                                console.log('[deepgram] Voice Agent message:', message.type, JSON.stringify(message, null, 2));
                                
                                switch (message.type) {
                                    case 'Welcome':
                                        console.log('[deepgram] Voice Agent welcomed');
                                        peer.send(JSON.stringify({ type: 'welcome', data: message }));
                                        break;
                                    case 'SettingsApplied':
                                        console.log('[deepgram] Voice Agent settings applied successfully');
                                        peer.send(JSON.stringify({ type: 'settings_applied', data: message }));
                                        break;
                                    case 'ConversationText':
                                        console.log('[deepgram] Voice Agent conversation text:', message);
                                        peer.send(JSON.stringify({ type: 'conversation_text', data: message }));
                                        break;
                                    case 'UserStartedSpeaking':
                                        console.log('[deepgram] Voice Agent detected user started speaking');
                                        peer.send(JSON.stringify({ type: 'user_started_speaking', data: message }));
                                        break;
                                    case 'AgentThinking':
                                        console.log('[deepgram] Voice Agent is thinking...');
                                        peer.send(JSON.stringify({ type: 'agent_thinking', data: message }));
                                        break;
                                    case 'AgentStartedSpeaking':
                                        console.log('[deepgram] Voice Agent started speaking');
                                        peer.send(JSON.stringify({ type: 'agent_started_speaking', data: message }));
                                        break;
                                    case 'AgentAudioDone':
                                        console.log('[deepgram] Voice Agent finished speaking');
                                        peer.send(JSON.stringify({ type: 'agent_audio_done', data: message }));
                                        break;
                                    case 'Error':
                                        console.error('[deepgram] Voice Agent error:', message);
                                        peer.send(JSON.stringify({ type: 'error', data: 'Voice Agent error: ' + JSON.stringify(message) }));
                                        break;
                                    default:
                                        console.log('[deepgram] Unknown Voice Agent message:', message.type, JSON.stringify(message, null, 2));
                                        peer.send(JSON.stringify({ type: 'unknown', data: message }));
                                }
                            } else {
                                // Handle binary audio data from Voice Agent
                                const audioData = data as Buffer;
                                console.log('[deepgram] Voice Agent audio data received:', audioData.length, 'bytes');
                                peer.send(audioData);
                            }
                        } catch (error) {
                            console.error('[deepgram] Error parsing Voice Agent message:', error);
                            console.error('[deepgram] Raw message data:', data);
                        }
                    });

                    deepgramWs.on('error', (error) => {
                        console.error('[deepgram] Voice Agent error:', error);
                        clearTimeout(connectionTimeout);
                        peer.send(JSON.stringify({ type: 'error', data: 'Voice Agent error: ' + error.message }));
                        // Don't return here, let it fall through to transcription mode
                        throw error;
                    });

                    deepgramWs.on('close', (code, reason) => {
                        console.log('[deepgram] Voice Agent connection closed:', code, reason.toString());
                        clearTimeout(connectionTimeout);
                        
                        // Clean up the connection reference
                        if ((peer as any).deepgramConnection === deepgramWs) {
                            delete (peer as any).deepgramConnection;
                            delete (peer as any).connectionType;
                        }
                        
                        peer.send(JSON.stringify({ type: 'disconnected', data: 'Voice Agent connection closed' }));
                        
                        // For code 1005 (no status code), try to reconnect or fall back to transcription
                        if (code === 1005) {
                            console.log('[deepgram] Voice Agent closed with no status code, attempting fallback to transcription mode...');
                            // Set up transcription mode as fallback
                            setupTranscriptionMode(peer);
                        } else if (code !== 1000) { // Not a normal close
                            console.error(`[deepgram] Voice Agent connection closed abnormally with code ${code}: ${reason.toString()}`);
                            // Try transcription mode as fallback
                            setupTranscriptionMode(peer);
                        }
                    });

                    // Store the Voice Agent connection
                    (peer as any).deepgramConnection = deepgramWs;
                    (peer as any).connectionType = 'voice_agent';
                    (peer as any).connectionTimeout = connectionTimeout;
                    
                    console.log('[deepgram] Voice Agent setup completed for peer:', peer.id);
                    return; // Successfully set up Voice Agent
                    
                } catch (voiceAgentError) {
                    console.error('[deepgram] Voice Agent setup failed:', voiceAgentError);
                    console.log('[deepgram] Falling back to transcription-only mode...');
                }
            } else {
                console.log('[deepgram] OpenAI API key not set, using transcription-only mode...');
            }

            // Fallback to transcription-only mode
            setupTranscriptionMode(peer);

        } catch (error) {
            console.error('[ws] Error setting up Deepgram connection:', error);
            peer.send(JSON.stringify({ type: 'error', data: 'Failed to connect to Deepgram: ' + (error as Error).message }));
        }
    },

    message(peer, message) {
        console.log('[ws] Received message from', peer.id, 'type:', typeof message);
        
        try {
            const connection = (peer as any).deepgramConnection;
            const connectionType = (peer as any).connectionType;
            
            if (!connection) {
                console.error('[ws] No Deepgram connection found for peer', peer.id);
                peer.send(JSON.stringify({ type: 'error', data: 'No Deepgram connection available' }));
                return;
            }

            if (typeof message === 'string') {
                console.log('[ws] Text message:', message);
                peer.send(JSON.stringify({ type: 'echo', data: message }));
            } else {
                console.log('[ws] Binary audio data received, size:', (message as any).byteLength || 'unknown');
                
                try {
                    if (connectionType === 'voice_agent') {
                        // Voice Agent WebSocket
                        const deepgramWs = connection as WebSocket;
                        if (deepgramWs.readyState === WebSocket.OPEN) {
                            deepgramWs.send(message);
                        } else {
                            console.error('[ws] Voice Agent connection not open, state:', deepgramWs.readyState);
                            // If connection is closed, try to set up transcription mode as fallback
                            if (deepgramWs.readyState === WebSocket.CLOSED || deepgramWs.readyState === WebSocket.CLOSING) {
                                console.log('[ws] Voice Agent connection is closed, switching to transcription mode...');
                                setupTranscriptionMode(peer);
                                // Try to send the audio data to the new transcription connection
                                setTimeout(() => {
                                    const newConnection = (peer as any).deepgramConnection;
                                    if (newConnection && newConnection.getReadyState() === 1) {
                                        newConnection.send(message);
                                    }
                                }, 100);
                            } else {
                                // Connection might still be opening, wait a bit
                                setTimeout(() => {
                                    if (deepgramWs.readyState !== WebSocket.OPEN) {
                                        peer.send(JSON.stringify({ type: 'error', data: 'Voice Agent connection not available' }));
                                    }
                                }, 1000);
                            }
                        }
                    } else {
                        // Transcription connection
                        if (connection.getReadyState() === 1) {
                            connection.send(message);
                        } else {
                            console.error('[ws] Transcription connection not open, state:', connection.getReadyState());
                            peer.send(JSON.stringify({ type: 'error', data: 'Transcription connection not available' }));
                        }
                    }
                } catch (error) {
                    console.error('[ws] Error sending audio to Deepgram:', error);
                    peer.send(JSON.stringify({ type: 'error', data: 'Failed to send audio to Deepgram' }));
                }
            }
        } catch (error) {
            console.error('[ws] Error processing message for peer', peer.id, ':', error);
            peer.send(JSON.stringify({ type: 'error', data: 'Error processing message: ' + (error as Error).message }));
        }
    },

    close(peer) {
        console.log('[ws] WebSocket connection closed:', peer.id);
        
        // Clear keep alive interval
        const keepAliveInterval = (peer as any).keepAliveInterval;
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            delete (peer as any).keepAliveInterval;
        }
        
        // Clear connection timeout
        const connectionTimeout = (peer as any).connectionTimeout;
        if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            delete (peer as any).connectionTimeout;
        }
        
        // Clean up connection
        const connection = (peer as any).deepgramConnection;
        const connectionType = (peer as any).connectionType;
        
        if (connection) {
            try {
                if (connectionType === 'voice_agent') {
                    (connection as WebSocket).close();
                } else {
                    connection.finish();
                }
            } catch (error) {
                console.error('[ws] Error closing Deepgram connection:', error);
            }
            delete (peer as any).deepgramConnection;
            delete (peer as any).connectionType;
        }
    },

    error(peer, error) {
        console.error('[ws] WebSocket error for', peer.id, ':', error);
        
        // Clear keep alive interval
        const keepAliveInterval = (peer as any).keepAliveInterval;
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            delete (peer as any).keepAliveInterval;
        }
        
        // Clear connection timeout
        const connectionTimeout = (peer as any).connectionTimeout;
        if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            delete (peer as any).connectionTimeout;
        }
        
        // Clean up on error
        const connection = (peer as any).deepgramConnection;
        const connectionType = (peer as any).connectionType;
        
        if (connection) {
            try {
                if (connectionType === 'voice_agent') {
                    (connection as WebSocket).close();
                } else {
                    connection.finish();
                }
            } catch (cleanupError) {
                console.error('[ws] Error cleaning up Deepgram connection:', cleanupError);
            }
            delete (peer as any).deepgramConnection;
            delete (peer as any).connectionType;
        }
    }
}); 