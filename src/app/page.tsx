'use client';
import { Sparkles, Menu, Search, User, ArrowRight, Star, Heart, MapPin, Wifi, Dumbbell, Coffee, Shield, CheckCircle2, Quote, Play } from 'lucide-react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Navbar } from '@/components/marketing/Navbar';
import { formatPLN } from '@/lib/currency';

export default function Home() {
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: horizontalProgress } = useScroll({ 
    target: horizontalScrollRef, 
    offset: ["start start", "end end"] 
  });
  const xTransform = useTransform(horizontalProgress, [0, 1], ["0%", "-75vw"]);

  const ctaRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: ctaProgress } = useScroll({
    target: ctaRef,
    offset: ["start end", "end end"]
  });
  const ctaScale = useTransform(ctaProgress, [0, 1], [0.8, 1]);
  const ctaOpacity = useTransform(ctaProgress, [0.5, 1], [0, 1]);

  return (
    <div className="w-full max-w-full bg-background">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="relative h-[78vh] min-h-[520px] w-full sm:h-[86vh]">
            <div className="absolute inset-0">
              <img src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=2069&auto=format&fit=crop" alt="Hero" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent"></div>
            </div>
            <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-10">
              <div className="max-w-xl">
                <motion.span 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-[10px] uppercase tracking-[0.3em] backdrop-blur sm:text-xs"
                >
                  <Sparkles className="h-3 w-3" style={{ color: 'var(--color-gold)' }} />
                  Premium Student Experience
                </motion.span>
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="font-display text-4xl leading-[1.05] sm:text-6xl lg:text-7xl"
                >
                  Find your perfect <em className="not-italic text-primary">student home.</em>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mt-5 max-w-md text-sm text-muted-foreground sm:text-base lg:text-lg"
                >
                  Premium student accommodation designed for comfort, community and convenience.
                </motion.p>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="mt-7 flex flex-wrap gap-3"
                >
                  <Link href="/hostels" className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-12 rounded-full px-6 transition-colors">
                    Search Accommodation <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
          
          <div className="border-y border-border bg-secondary/10 py-3 overflow-hidden">
            <div className="marquee flex gap-12 whitespace-nowrap text-xs uppercase tracking-[0.3em] text-muted-foreground sm:text-sm">
              <div className="flex shrink-0 items-center gap-12 pr-12">
                <span>✦ Safe accommodation</span>
                <span>✦ Verified rooms</span>
                <span>✦ Flexible stays</span>
                <span>✦ Student community</span>
                <span>✦ University proximity</span>
                <span>✦ 24/7 Security</span>
              </div>
              <div className="flex shrink-0 items-center gap-12 pr-12">
                <span>✦ Safe accommodation</span>
                <span>✦ Verified rooms</span>
                <span>✦ Flexible stays</span>
                <span>✦ Student community</span>
                <span>✦ University proximity</span>
                <span>✦ 24/7 Security</span>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Hostels */}
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div className="mx-auto mb-10 max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">Featured</p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl">Our Residences.</h2>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">Explore our hand-picked properties designed for the modern student.</p>
          </div>
          
          <div className="flex gap-5 pl-4 sm:gap-6 sm:pl-6 lg:pl-10 overflow-x-auto pb-8 snap-x">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="group relative shrink-0 snap-start">
                <Link href={`/hostels/property-${i}`} className="block">
                  <div className="relative h-[420px] w-[280px] overflow-hidden rounded-2xl bg-muted sm:h-[520px] sm:w-[360px]">
                    <img src={`https://images.unsplash.com/photo-${i === 1 ? '1522708323590-d24dbb6b0267' : i === 2 ? '1502672260266-1c1f52d11018' : i === 3 ? '1600596542815-ffad4c1539a9' : '1560448204-e02f11c3d0e2'}?auto=format&fit=crop&q=80&w=1000`} alt="Hostel" className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5 text-white">
                      <div className="text-[10px] uppercase tracking-[0.3em] opacity-80">Premium</div>
                      <div className="mt-1 font-display text-xl sm:text-2xl">The Grand Residence {i}</div>
                      <div className="mt-1 text-sm opacity-90">From {formatPLN(400)}/month</div>
                    </div>
                  </div>
                </Link>
                <button aria-label="Book Now" className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide shadow-md transition hover:scale-105 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                  <Sparkles className="h-3 w-3 text-primary" /> Book Now
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Why Choose Polska Veed / Categories */}
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">Curated</p>
              <h2 className="font-display text-3xl sm:text-4xl">Experience matters</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {[
              { title: 'Safe accommodation', img: '1556228578-0d85b1a4d571', subtitle: '24/7 Security' },
              { title: 'Student community', img: '1523240795612-9a054b0db644', subtitle: 'Events & Networking' },
              { title: 'Verified rooms', img: '1522771739844-6a9f6d5f14af', subtitle: 'Quality Assured' },
            ].map((item, idx) => (
              <div key={idx} className={`group relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted ${idx === 2 ? 'col-span-2 lg:col-span-1 sm:aspect-[21/9] lg:aspect-[4/5]' : ''}`}>
                <img src={`https://images.unsplash.com/photo-${item.img}?auto=format&fit=crop&q=80&w=800`} alt={item.title} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="text-[10px] uppercase tracking-[0.3em] opacity-80">{item.subtitle}</div>
                  <div className="mt-1 font-display text-2xl">{item.title}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- NEW SECTION 4: HORIZONTAL SCROLL AMENITIES --- */}
        <section ref={horizontalScrollRef} className="relative h-[400vh] bg-background text-foreground border-t border-border/50">
          <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-5">
               <img src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=2000&auto=format&fit=crop" className="w-full h-full object-cover grayscale" alt="Background pattern" />
            </div>
            
            <div className="relative z-10 px-4 sm:px-10 lg:px-20 mb-10 w-full max-w-7xl mx-auto">
              <h2 className="font-display text-4xl sm:text-6xl text-foreground">Unmatched Amenities.</h2>
              <p className="text-[var(--color-gold)] mt-2 tracking-widest uppercase text-sm font-bold">Everything you need under one roof</p>
            </div>

            <motion.div 
              style={{ x: xTransform }} 
              className="relative z-10 flex gap-6 sm:gap-10 px-4 sm:px-10 lg:px-20 w-[300vw] sm:w-[250vw] lg:w-[200vw]"
            >
              {[
                { title: "24/7 Fitness Center", desc: "State-of-the-art equipment, free weights, and dedicated yoga studios.", icon: Dumbbell, img: "1534438327276-14e5300c3a48" },
                { title: "Quiet Study Hubs", desc: "Private pods and collaborative desks designed for deep focus.", icon: Sparkles, img: "1497361415632-8408cb9bbd0a" },
                { title: "Artisan Coffee Lounge", desc: "Complimentary morning coffee in our designer social spaces.", icon: Coffee, img: "1445116518149-cd8b049615a1" },
                { title: "Cinema Room", desc: "Private screening room with 4K projection and surround sound.", icon: Play, img: "1517604931062-34ce212b4d3a" }
              ].map((amenity, i) => (
                <div key={i} className="w-[85vw] sm:w-[60vw] lg:w-[45vw] shrink-0 group">
                  <div className="relative h-[50vh] sm:h-[60vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                    <img src={`https://images.unsplash.com/photo-${amenity.img}?auto=format&fit=crop&q=80&w=1200`} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt={amenity.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                    <div className="absolute inset-0 p-8 flex flex-col justify-end">
                      <div className="h-16 w-16 rounded-full bg-[var(--color-gold)] text-primary flex items-center justify-center mb-6 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                        <amenity.icon className="h-8 w-8" />
                      </div>
                      <h4 className="font-display text-3xl sm:text-4xl text-white mb-3">{amenity.title}</h4>
                      <p className="text-white/80 text-lg max-w-md">{amenity.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* --- NEW SECTION 5: BENTO BOX ROOM TYPES --- */}
        <section className="py-24 sm:py-32 bg-background relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto mb-16 sm:mb-20"
            >
              <h2 className="font-display text-4xl sm:text-5xl mb-4">Spaces designed for you</h2>
              <p className="text-muted-foreground text-lg">From private studios to shared en-suites, discover layouts crafted for every lifestyle.</p>
            </motion.div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Premium Penthouse - Large Card */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 0.98 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="lg:col-span-8 group relative rounded-[2rem] overflow-hidden bg-muted aspect-square sm:aspect-video lg:aspect-auto lg:h-[600px] shadow-lg cursor-pointer"
              >
                <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1600" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Penthouse" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 sm:p-12 text-white">
                  <div className="inline-block bg-[var(--color-gold)] text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4">Flagship</div>
                  <h3 className="font-display text-4xl sm:text-5xl mb-3">Penthouse Suite</h3>
                  <p className="text-white/80 max-w-md mb-6">32-40 sq.m • Super King Bed • Private Terrace</p>
                  <span className="text-xl font-medium">From {formatPLN(750)}/mo</span>
                </div>
                <div className="absolute top-8 right-8 h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="h-6 w-6 text-white -rotate-45" />
                </div>
              </motion.div>

              <div className="lg:col-span-4 flex flex-col gap-6">
                {/* En-suite - Small Card 1 */}
                <motion.div 
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 0.98 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="group relative rounded-[2rem] overflow-hidden bg-muted flex-1 min-h-[280px] shadow-lg cursor-pointer"
                >
                  <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="En-suite" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-6 sm:p-8 text-white">
                    <h3 className="font-display text-2xl mb-2">Premium En-suite</h3>
                    <p className="text-white/80 text-sm mb-4">14-16 sq.m • Double Bed</p>
                    <span className="text-lg font-medium">From {formatPLN(400)}/mo</span>
                  </div>
                </motion.div>

                {/* Studio - Small Card 2 */}
                <motion.div 
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 0.98 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="group relative rounded-[2rem] overflow-hidden bg-muted flex-1 min-h-[280px] shadow-lg cursor-pointer"
                >
                  <img src="https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Studio" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-6 sm:p-8 text-white">
                    <h3 className="font-display text-2xl mb-2">Luxury Studio</h3>
                    <p className="text-white/80 text-sm mb-4">20-24 sq.m • Private Kitchen</p>
                    <span className="text-lg font-medium">From {formatPLN(550)}/mo</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* --- NEW SECTION 6: NEIGHBORHOOD FLOATING PARALLAX --- */}
        <section className="relative py-32 overflow-hidden bg-background text-foreground border-y border-border/50">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_0%,transparent_70%)]"></div>
          </div>
          
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="font-display text-4xl sm:text-6xl mb-6"
              >
                In the heart of the action.
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-lg max-w-2xl mx-auto"
              >
                Unbeatable locations that put you right next to campus, transport links, and the best of city life.
              </motion.p>
            </div>

            <div className="relative h-[500px] sm:h-[600px] w-full max-w-4xl mx-auto">
              {/* Center Map/Image Graphic */}
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, type: "spring" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] sm:h-[400px] sm:w-[400px] rounded-full border border-white/20 overflow-hidden shadow-2xl"
              >
                <img src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover" alt="City Map" />
                <div className="absolute inset-0 bg-primary/40 mix-blend-multiply"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-4 w-4 bg-[var(--color-gold)] rounded-full animate-ping absolute"></div>
                  <div className="h-4 w-4 bg-[var(--color-gold)] rounded-full relative z-10"></div>
                </div>
              </motion.div>

              {/* Floating Cards */}
              {[
                { top: "10%", left: "5%", icon: MapPin, title: "< 10 min", sub: "Walk to Campus", delay: 0 },
                { top: "70%", left: "10%", icon: Coffee, title: "50+", sub: "Local Cafes", delay: 0.2 },
                { top: "15%", right: "5%", icon: Dumbbell, title: "2 min", sub: "To Subway", delay: 0.4 },
                { top: "65%", right: "5%", icon: Shield, title: "100%", sub: "Safe Zones", delay: 0.6 }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  animate={{ y: [0, -15, 0] }}
                  transition={{ 
                    duration: 0.5, 
                    delay: stat.delay, 
                    y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: stat.delay }
                  }}
                  style={{ top: stat.top, left: stat.left, right: stat.right }}
                  className="absolute bg-background text-foreground p-4 sm:p-5 rounded-2xl shadow-2xl border border-border/50 min-w-[160px] sm:min-w-[180px] z-20 backdrop-blur-md"
                >
                  <stat.icon className="h-6 w-6 text-[var(--color-gold)] mb-3" />
                  <h4 className="font-bold text-xl mb-1">{stat.title}</h4>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{stat.sub}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- NEW SECTION 7: MASONRY TESTIMONIALS --- */}
        <section className="py-24 sm:py-32 bg-secondary/5 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <span className="text-[var(--color-gold)] uppercase tracking-widest text-sm font-bold mb-4 block">Student Stories</span>
              <h2 className="font-display text-4xl sm:text-5xl">Don't just take our word for it.</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[
                { name: "Sarah Jenkins", uni: "King's College", text: "The study rooms saved me during finals week. The environment here is incredibly supportive and the design is beautiful.", y: 0 },
                { name: "Marcus Thorne", uni: "UCL", text: "Moving here was the best decision. The gym is better than most commercial ones, and my studio feels like a luxury hotel room. Highly recommend it to anyone looking for comfort.", y: 40 },
                { name: "Elena Rossi", uni: "LSE", text: "I've made amazing friends at the social events. The staff are so friendly and the security makes me feel completely safe coming home late.", y: 0 },
                { name: "David Chen", uni: "Imperial College", text: "Fastest WiFi I've ever experienced. The location is just unbeatable for getting to campus.", y: 40 },
                { name: "Emma Watson", uni: "UAL", text: "As a design student, the aesthetics of this place really inspire me. The natural light in the studios is perfect for my projects.", y: 0 },
                { name: "James Holden", uni: "Queen Mary", text: "The booking process was so simple and transparent. No hidden fees, just exactly what was promised. A breath of fresh air.", y: 40 }
              ].map((review, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: review.y }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="bg-card border border-border/60 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-shadow relative"
                >
                  <Quote className="absolute top-6 right-8 h-12 w-12 text-secondary/5" />
                  <div className="flex gap-1 mb-6 relative z-10">
                    {[1,2,3,4,5].map(s => <Star key={s} className="h-4 w-4 fill-[var(--color-gold)] text-[var(--color-gold)]" />)}
                  </div>
                  <p className="text-base sm:text-lg mb-8 leading-relaxed text-card-foreground relative z-10">"{review.text}"</p>
                  <div className="flex items-center gap-4 mt-auto border-t border-border/50 pt-6 relative z-10">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{review.name}</h4>
                      <p className="text-xs text-muted-foreground">{review.uni}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- NEW SECTION 8: CINEMATIC CTA --- */}
        <section ref={ctaRef} className="py-24 sm:py-32 bg-background relative overflow-hidden">
          <motion.div 
            style={{ scale: ctaScale, opacity: ctaOpacity }}
            className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
          >
            <div className="relative rounded-[3rem] overflow-hidden shadow-2xl">
              <img src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=2069&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover" alt="CTA Background" />
              <div className="absolute inset-0 bg-primary/90 backdrop-blur-sm"></div>
              
              <div className="relative z-10 p-12 sm:p-20 text-center text-white flex flex-col items-center">
                <div className="h-20 w-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 mb-8">
                  <CheckCircle2 className="h-10 w-10 text-[var(--color-gold)]" />
                </div>
                <h2 className="font-display text-5xl sm:text-7xl mb-6">Ready to move in?</h2>
                <p className="text-primary-foreground/80 text-xl mb-12 max-w-2xl">
                  Secure your premium room for the upcoming academic year in just a few clicks. Join a community built for excellence.
                </p>
                
                <Link href="/booking" className="group relative inline-flex items-center justify-center gap-3 bg-[var(--color-gold)] text-primary h-16 px-10 rounded-full font-bold text-lg hover:bg-white transition-all shadow-[0_0_40px_rgba(201,162,39,0.4)] overflow-hidden">
                  <div className="absolute inset-0 bg-white translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300"></div>
                  <span className="relative z-10 flex items-center gap-2">
                    Book Your Room Now <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
