import {
  Bot,
  Clock3,
  ContactRound,
  Gauge,
  LockKeyhole,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import type { ProjectVisualKind } from '@/lib/projects';

function GateVisual() {
  return (
    <div className="visual-scene gate-scene">
      <div className="browser-bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <div>news.example</div>
      </div>
      <div className="gate-layout">
        <div className="gate-status">
          <LockKeyhole size={22} aria-hidden="true" />
          <span className="mono">Navigation paused</span>
          <strong>Make the case.</strong>
        </div>
        <div className="gate-chat">
          <div className="chat-line chat-line-user">
            <MessageSquareText size={15} aria-hidden="true" />
            I need the score for tonight&apos;s game.
          </div>
          <div className="chat-line chat-line-agent">
            <Sparkles size={15} aria-hidden="true" />
            Is this time-sensitive, or can it wait?
          </div>
          <div className="approval-chip">
            <Clock3 size={14} aria-hidden="true" />
            30:00 access window
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentsVisual() {
  return (
    <div className="visual-scene agents-scene">
      <div className="agent-node agent-node-left">
        <Bot size={22} aria-hidden="true" />
        <span className="mono">Collector agent</span>
        <strong>Request $240</strong>
      </div>
      <div className="negotiation-track" aria-hidden="true">
        <span>proposal</span>
        <div />
        <ShieldCheck size={23} />
        <div />
        <span>counter</span>
      </div>
      <div className="agent-node agent-node-right">
        <UsersRound size={22} aria-hidden="true" />
        <span className="mono">Payer agent</span>
        <strong>Offer $205</strong>
      </div>
      <div className="settlement-receipt">
        <ReceiptText size={18} aria-hidden="true" />
        <div>
          <span className="mono">x402 settlement</span>
          <strong>Terms accepted</strong>
        </div>
      </div>
    </div>
  );
}

function PhoneVisual() {
  return (
    <div className="visual-scene phone-scene">
      <div className="phone-frame">
        <div className="phone-speaker" />
        <div className="phone-content">
          <span className="mono">LuckyNumber</span>
          <div className="contact-orbit">
            <span>AK</span>
            <span>JM</span>
            <span>RS</span>
          </div>
          <div className="selected-contact">
            <ContactRound size={24} aria-hidden="true" />
            <div>
              <small>Today&apos;s pick</small>
              <strong>Call someone</strong>
            </div>
          </div>
          <div className="performance-chip">
            <Gauge size={15} aria-hidden="true" />
            Launch: under 100ms
          </div>
        </div>
      </div>
      <div className="phone-side-note">
        <Smartphone size={18} aria-hidden="true" />
        <span>2,000+ contacts</span>
        <strong>Privacy-aware selection</strong>
      </div>
    </div>
  );
}

export default function ProjectVisual({
  kind,
  label,
}: {
  kind: ProjectVisualKind;
  label: string;
}) {
  return (
    <div className="project-visual" role="img" aria-label={label}>
      <div className="visual-caption">
        <span className="mono">System specimen</span>
        <span aria-hidden="true">live model</span>
      </div>
      {kind === 'gate' && <GateVisual />}
      {kind === 'agents' && <AgentsVisual />}
      {kind === 'phone' && <PhoneVisual />}
    </div>
  );
}
