'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Disc3, Grid2X2, Lock, Server, Sparkles } from 'lucide-react';
import { loginUrl } from '@/lib/api';
import { useAuth } from '@/lib/hooks';
import { LoadingScreen } from '@/components/DashboardShell';

export default function LoginPage() {
	const router = useRouter();
	const { auth, loading } = useAuth(false);

	useEffect(() => {
		if (auth) {
			router.replace('/servers');
		}
	}, [auth, router]);

	if (loading) {
		return <LoadingScreen text="Checking Discord session..." />;
	}

	return (
		<main className="login-page">
			<section className="login-marketing">
				<div className="brand large">
					<div className="brand-mark">
						<Bot size={24} />
					</div>
					<div className="brand-name">Priyx Dashboard</div>
				</div>

				<div className="hero-copy">
					<h1>Built for your server from the ground up</h1>
					<p>
						Priyx gives your community a clean control center for modules,
						automation, tickets, music, and moderation.
					</p>
					<a className="secondary-cta" href="#features">
						Explore features
					</a>
					<div className="slider-dots">
						<span />
						<span />
						<span />
					</div>
				</div>

				<div className="dashboard-preview" id="features">
					<div className="mini-sidebar">
						<div className="mini-brand">
							<Bot size={18} />
							<strong>Priyx Dashboard</strong>
							<em>beta</em>
						</div>
						<div className="mini-server">SnapGrids</div>
						<span className="mini-active">Dashboard</span>
						<span>My Servers</span>
						<span>Modules</span>
						<span>Audit Logs</span>
					</div>
					<div className="mini-main">
						<h2>Dashboard</h2>
						<p>Manage your server settings and modules.</p>
						<div className="mini-card">
							<Server />
							<div>
								<strong>3,496</strong>
								<span>Members</span>
							</div>
							<div>
								<strong>+225</strong>
								<span>Growth</span>
							</div>
						</div>
						<div className="mini-grid">
							<div>Bug Reports</div>
							<div>Join Role</div>
						</div>
					</div>
				</div>
			</section>

			<section className="login-panel">
				<div className="panel-shape" />
				<div className="login-card">
					<div className="login-icon">
						<Sparkles size={30} />
					</div>
					<h2>Welcome Back</h2>
					<p>
						Log in with Discord to access your dashboard and manage servers
						you have permission to control.
					</p>
					<a className="primary-cta" href={loginUrl('/servers')}>
						<Disc3 size={18} />
						Login with Discord
					</a>
					<div className="terms">
						<Lock size={15} />
						By logging in, you agree to the Priyx Dashboard access policy.
					</div>
					<div className="legal-links">
						<a href="/terms">Terms</a>
						<a href="/privacy">Privacy</a>
						<a href="/license">License</a>
						<a href="/about">About</a>
					</div>
				</div>
				<div className="outline-word">PRIYX</div>
			</section>
		</main>
	);
}
