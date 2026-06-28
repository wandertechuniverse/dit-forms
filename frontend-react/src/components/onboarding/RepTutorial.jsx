import { useState } from 'react';
import { CheckCircle, ArrowRight, Camera, BarChart3, X } from 'lucide-react';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome, Class Rep!',
    description: 'This 3-minute tutorial teaches you how to record payments safely. You\'ll practice with fake data — nothing affects real students.',
    action: 'Start Tutorial',
  },
  {
    id: 'record-payment',
    title: 'Step 1: Record a Payment',
    description: 'Enter an invoice number, amount, and reference. Try "INV-DEMO-0001" with amount 150.00.',
    demoData: { invoiceNumber: 'INV-DEMO-0001', amount: '150.00', reference: 'TUTORIAL-TEST' },
  },
  {
    id: 'qr-scan',
    title: 'Step 2: Scan a QR Code',
    description: 'Click the camera icon next to the invoice field. We\'ll simulate a scan that auto-fills the form.',
    simulatedScan: { invoiceNumber: 'INV-DEMO-0002', amount: '75.50' },
  },
  {
    id: 'scorecard',
    title: 'Step 3: View Your Scorecard',
    description: 'After recording payments, visit /rep/dashboard to see your accuracy, speed, and consistency metrics.',
    link: '/rep/dashboard',
  },
  {
    id: 'complete',
    title: 'You\'re Ready!',
    description: 'You now know how to record payments, use QR scanning, and track your performance.',
    action: 'Finish & Go to Dashboard',
  },
];

export default function RepTutorial({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);
  const step = STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setDone(true);
      onComplete?.();
    }
  };

  if (done) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="h-1 bg-gray-200">
          <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Step {currentStep + 1} of {STEPS.length}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h2>
          <p className="text-gray-600 leading-relaxed mb-6">{step.description}</p>

          {step.id === 'record-payment' && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <input readOnly value={step.demoData.invoiceNumber} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono" />
              <div className="grid grid-cols-2 gap-3">
                <input readOnly value={step.demoData.amount} className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm" />
                <input readOnly value={step.demoData.reference} className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm" />
              </div>
              <p className="text-xs text-gray-500">Fields pre-filled for demonstration</p>
            </div>
          )}

          {step.id === 'qr-scan' && (
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 text-center">
              <Camera size={48} className="mx-auto mb-3 text-indigo-600 animate-pulse" />
              <p className="text-sm text-gray-600">Simulating QR scan...</p>
              <div className="mt-3 p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs font-mono text-emerald-700">Scanned: {step.simulatedScan.invoiceNumber} &bull; GH&#8373; {step.simulatedScan.amount}</p>
              </div>
            </div>
          )}

          {step.id === 'scorecard' && (
            <a href={step.link} target="_blank" rel="noopener noreferrer" className="block p-4 bg-indigo-50 rounded-xl border border-indigo-200 text-center hover:bg-indigo-100 transition-colors">
              <BarChart3 size={32} className="mx-auto mb-2 text-indigo-600" />
              <p className="text-sm font-medium text-indigo-700">Open Scorecard (new tab)</p>
            </a>
          )}
        </div>

        <div className="px-8 py-4 bg-gray-50 flex items-center justify-between border-t border-gray-200">
          <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30">Back</button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button onClick={() => { setDone(true); onComplete?.(); }} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1"><X size={14} /> Skip</button>
            )}
            <button onClick={handleNext} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
              {step.action || 'Continue'} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
