import React from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const RegistrationCTA = ({ isRegistered, event, user, actionLoading, handleRegister, handleUnregister, capacityRemaining, customRegisterNode }: any) => {
    if (customRegisterNode) return customRegisterNode;

    return (
        <div className="bg-brutal-dark text-brutal-bg rounded-2xl p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brutal-red/10 rounded-bl-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-brutal-bg/5 rounded-tr-full pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-5">
                <div className="flex-1">
                    <h2 className="font-heading font-bold text-xl md:text-2xl uppercase tracking-tight-heading mb-2">
                        {isRegistered ? "You're In!" : "Secure Your Spot"}
                    </h2>
                    <p className="font-data text-xs md:text-sm text-brutal-bg/60 max-w-md">
                        {isRegistered
                            ? "You're registered. We'll see you there."
                            : capacityRemaining !== null
                                ? `Only ${capacityRemaining} spot${capacityRemaining !== 1 ? 's' : ''} remaining.`
                                : `${event.registration_count} makers have already joined.`
                        }
                    </p>
                </div>

                <div className="flex flex-col items-center gap-2 min-w-[180px]">
                    {isRegistered ? (
                        <>
                            <div className="bg-green-500/20 border border-green-400/30 text-green-300 px-6 py-3 rounded-full font-data text-sm font-bold uppercase tracking-wider">
                                ✓ Registered
                            </div>
                            <button
                                onClick={handleUnregister}
                                disabled={actionLoading}
                                className="font-data text-[10px] text-brutal-bg/40 hover:text-brutal-red uppercase font-bold tracking-widest transition-colors"
                            >
                                {actionLoading ? 'Processing...' : 'Unregister'}
                            </button>
                        </>
                    ) : event.registration_status === 'open' && (capacityRemaining === null || capacityRemaining > 0) ? (
                        user ? (
                            <Button
                                size="lg"
                                className="bg-brutal-red text-brutal-bg hover:bg-brutal-bg hover:text-brutal-dark shadow-[4px_4px_0px_rgba(245,243,238,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                                onClick={handleRegister}
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Registering...' : 'Register Now'}
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        ) : (
                            <Link to="/login">
                                <Button size="lg" className="bg-brutal-bg text-brutal-dark hover:bg-brutal-red hover:text-brutal-bg transition-all">
                                    Log in to Register
                                </Button>
                            </Link>
                        )
                    ) : (
                        <div className="bg-brutal-bg/10 border border-brutal-bg/20 px-6 py-3 rounded-full font-data text-sm font-bold uppercase text-brutal-bg/50">
                            Registration Closed
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RegistrationCTA;
