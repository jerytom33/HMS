import { Navbar } from '@/components/marketing/Navbar';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Header */}
        <section className="pt-8 pb-10 sm:pt-12 sm:pb-16 text-center px-4">
          <span className="text-[var(--color-gold)] font-bold tracking-widest uppercase text-sm mb-4 block">Reach Out</span>
          <h1 className="font-display text-5xl md:text-7xl mb-6">Get in Touch.</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Whether you have a question about our properties, pricing, or availability, our dedicated team is here to help you every step of the way.
          </p>
        </section>

        {/* Content */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
          <div className="grid min-w-0 grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-24">
            
            {/* Contact Form */}
            <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-border/50 bg-card p-5 shadow-sm sm:p-8 lg:p-10">
              <h3 className="font-display text-3xl mb-8">Send a Message</h3>
              <form className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <input type="text" className="w-full h-12 bg-background border border-border rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] transition-shadow" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <input type="text" className="w-full h-12 bg-background border border-border rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] transition-shadow" placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <input type="email" className="w-full h-12 bg-background border border-border rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] transition-shadow" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <textarea className="w-full h-32 bg-background border border-border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] transition-shadow resize-none" placeholder="How can we help you?"></textarea>
                </div>
                <button type="button" className="w-full h-14 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                  Send Message <Send className="h-4 w-4" />
                </button>
              </form>
            </div>

            {/* Contact Details */}
            <div className="flex flex-col justify-center space-y-12">
              <div>
                <h3 className="font-display text-3xl mb-8">Contact Information</h3>
                <div className="space-y-8">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-6 w-6 text-[var(--color-gold)]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">Our Headquarters</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        123 University Avenue<br />
                        London, UK<br />
                        WC1E 6BT
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="h-6 w-6 text-[var(--color-gold)]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">Phone</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        +44 (0) 20 7123 4567<br />
                        Mon-Fri, 9am - 6pm
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-6 w-6 text-[var(--color-gold)]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">Email</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        hello@hms-premium.com<br />
                        support@hms-premium.com
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
