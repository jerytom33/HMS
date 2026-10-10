import { HelpCircle, ChevronDown } from 'lucide-react';

export default function FAQPage() {
  const faqs = [
    { q: "What's included in the rent?", a: "Your rent covers high-speed Wi-Fi, all utilities (water, electricity, heating), bi-weekly room cleaning, and access to all building amenities like the gym and study lounges." },
    { q: "Can I bring guests?", a: "Yes, you can have guests over. However, overnight guests must be registered at the reception for security purposes and are limited to 3 nights per month." },
    { q: "How do I report a maintenance issue?", a: "You can easily report any maintenance issues through your Student Portal dashboard under the 'Maintenance' section." },
    { q: "Is the security deposit refundable?", a: "Yes, your security deposit is fully refundable at the end of your tenancy, provided there is no damage to the room or outstanding balances." },
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="font-display text-4xl md:text-5xl text-center mb-12">Frequently Asked Questions</h1>
        
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="group min-w-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary sm:p-6">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <h3 className="flex min-w-0 items-center gap-3 text-lg font-medium">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  {faq.q}
                </h3>
                <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              {/* Note: In a real app, this would be an accordion. For static UI, we'll just show it. */}
              <p className="mt-4 text-muted-foreground sm:pl-8">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
