# CourtReserve vs Thirdshot: Comprehensive Competitive Analysis

> **Analysis Date:** 2026-02-22  
> **Subject:** CourtReserve.com competitive positioning against Thirdshot platform  
> **Analyst:** Subagent Research  

---

## Executive Summary

CourtReserve is a mature, feature-rich club management platform serving 2,200+ clubs, 5M+ players, and processing 25M+ reservations. They target tennis, pickleball, and padel facilities with comprehensive SaaS offerings at $199/month for their popular "Grow" plan.

Thirdshot is currently a single-facility booking platform with solid technical foundations but significant feature gaps for SaaS deployment to multiple clubs. The gap analysis reveals 40+ missing features across 8 major categories.

**Critical Finding:** Thirdshot needs substantial development to compete as a multi-tenant SaaS platform. Current state is comparable to a basic booking widget, while CourtReserve offers full club management.

---

## 1. CourtReserve Feature Breakdown

### 🏟️ **Booking & Reservations**
- ✅ Multi-court reservations with flexible rules
- ✅ Public booking links (sharable reservation pages)
- ✅ Waitlist management with auto-fill
- ✅ Guest & drop-in tracking
- ✅ Self check-in (mobile, tablet, kiosk)
- ✅ QR code integration
- ✅ Advanced booking rules per member type
- ✅ Court type differentiation
- ✅ Flexible time slot configurations

### 👥 **Membership Management**
- ✅ Flexible membership tiers & benefits
- ✅ Member restrictions & privileges
- ✅ Recurring membership billing
- ✅ Member portal (customized micro-site)
- ✅ Member directory & player match-maker
- ✅ Member communication tools
- ✅ Branded domain support
- ✅ Digital waivers & e-signatures

### 💰 **Payments & Financial Management**
- ✅ Credit card & ACH payments
- ✅ Automated invoicing & billing
- ✅ Batch billing for memberships
- ✅ Pro shop & POS integration
- ✅ Prepaid packages with balance tracking
- ✅ Financial reporting & revenue analytics
- ✅ Payment processing flexibility

### 🎾 **Events & Programs**
- ✅ One-time & recurring events
- ✅ Team-based tournaments
- ✅ Round robin events
- ✅ Social events & drop-ins
- ✅ Private & group lessons
- ✅ Instructor management
- ✅ Lesson scheduling & payments
- ✅ Attendance tracking

### 🏆 **Leagues & Competition**
- ✅ Automated league management
- ✅ Match scheduling automation
- ✅ Score tracking & standings
- ✅ Individual & team-based leagues
- ✅ Ladders & rankings system
- ✅ Player progression tracking

### 📱 **Mobile & User Experience**
- ✅ Custom-branded mobile apps (iOS/Android)
- ✅ Native mobile booking experience
- ✅ Push notifications
- ✅ Offline functionality
- ✅ Mobile payments
- ✅ QR code scanning

### 📊 **Admin & Management**
- ✅ Comprehensive dashboards & KPIs
- ✅ Revenue & utilization reporting
- ✅ Member analytics
- ✅ Staff management tools
- ✅ Multi-location management
- ✅ Access control integration
- ✅ Audit trails

### 📧 **Communication & Marketing**
- ✅ SMS & app alerts
- ✅ Email marketing campaigns
- ✅ Automated reminders & confirmations
- ✅ Announcements & news feeds
- ✅ Newsletter tools
- ✅ Marketing automation

### 🔧 **Integrations & Specializations**
- ✅ Swish integration (league management)
- ✅ Save My Play (AI video recording)
- ✅ Access control systems
- ✅ Stringing module (equipment service)
- ✅ API access for custom integrations
- ✅ Kiosk mode for tablets

---

## 2. Thirdshot Current State

### ✅ **Implemented Features**

**Core Booking Engine:**
- Court reservation system (7-day booking window)
- Real-time availability checking
- Up to 3 consecutive hour slots
- Atomic booking transactions
- Peak hour pricing support
- Court blocking for maintenance

**Payment Integration:**
- HitPay integration with PayNow QR codes
- Payment timeout handling (10 minutes)
- Payment confirmation workflow
- Webhook processing

**User Management:**
- Supabase authentication (email/password + Google OAuth)
- User profiles with basic info
- Role-based access (USER/ADMIN)
- Protected routes

**Basic Admin Panel:**
- Court management (CRUD)
- Booking overview
- Court blocking system
- Audit logging
- Dashboard with basic stats

**Mobile & PWA:**
- Progressive Web App setup
- Mobile-responsive design
- Bottom navigation for mobile
- Offline capability

**Technical Foundation:**
- Next.js 16 with App Router
- PostgreSQL + Prisma ORM
- Singapore timezone support
- Email notifications (Resend)
- TypeScript throughout

### ⚠️ **Current Limitations**
- **Single-tenant:** Built for one facility only
- **No membership system:** Users can book but no member tiers/benefits
- **No events/programs:** Only court reservations
- **No leagues/competitions:** Missing entirely
- **Basic payment:** Only one-time payments, no recurring billing
- **Limited admin tools:** Basic CRUD operations only
- **No marketing features:** No email campaigns, SMS, etc.
- **No integrations:** Standalone system with no external connections

---

## 3. Gap Analysis

### 🚨 **Critical Gaps (SaaS Blockers)**

**Multi-Tenancy & Club Management:**
- ❌ No multi-tenant architecture
- ❌ No club/organization entity model
- ❌ No per-club customization
- ❌ No staff role management beyond basic admin
- ❌ No club-specific branding
- ❌ No multi-location support

**Membership System:**
- ❌ No membership tiers or levels
- ❌ No membership benefits/restrictions
- ❌ No recurring membership billing
- ❌ No member-specific pricing
- ❌ No member directories or networking

**Financial Management:**
- ❌ No invoicing system
- ❌ No batch billing
- ❌ No financial reporting
- ❌ No revenue analytics
- ❌ No pro shop/POS integration
- ❌ No prepaid packages

### 🏟️ **Booking & Reservations Gaps**

**Advanced Booking Features:**
- ❌ No public booking links (shareable pages)
- ❌ No waitlist management
- ❌ No guest/drop-in handling
- ❌ No self check-in systems
- ❌ No QR code integration
- ❌ No flexible booking rules per member type

**Court Management:**
- ❌ No court type differentiation
- ❌ No amenity tracking
- ❌ No equipment management

### 🎾 **Events & Programs Gaps**

**Event Management:**
- ❌ No event creation system
- ❌ No tournaments or competitions
- ❌ No recurring events
- ❌ No social events or drop-ins
- ❌ No event registration & payments

**Lesson Management:**
- ❌ No lesson booking system
- ❌ No instructor management
- ❌ No private/group lesson differentiation
- ❌ No lesson packages

### 🏆 **Competition & Social Gaps**

**Leagues & Tournaments:**
- ❌ No league management system
- ❌ No automated match scheduling
- ❌ No score tracking
- ❌ No standings/leaderboards
- ❌ No ladder/ranking systems

**Social Features:**
- ❌ No player match-maker
- ❌ No member directory
- ❌ No social events

### 📱 **Mobile & UX Gaps**

**Mobile Experience:**
- ❌ No native mobile apps
- ❌ No push notifications
- ❌ No offline booking (beyond basic PWA)
- ❌ No custom branding

**User Portal:**
- ❌ No customized member portal
- ❌ No branded domain support
- ❌ No custom club websites

### 📧 **Communication Gaps**

**Marketing & Communication:**
- ❌ No SMS messaging system
- ❌ No email marketing campaigns
- ❌ No automated marketing sequences
- ❌ No announcement system
- ❌ No newsletter tools

**Notifications:**
- ❌ Limited to basic email confirmations
- ❌ No reminder systems beyond basic booking emails
- ❌ No customizable notification templates

### 📊 **Analytics & Reporting Gaps**

**Business Intelligence:**
- ❌ No comprehensive dashboards
- ❌ No revenue reporting
- ❌ No utilization analytics
- ❌ No member behavior tracking
- ❌ No business KPIs

**Reporting:**
- ❌ No automated reports
- ❌ No export functionality
- ❌ No custom report builder

### 🔧 **Integration & Specialization Gaps**

**Third-Party Integrations:**
- ❌ No API for external integrations
- ❌ No access control system integration
- ❌ No video recording integration
- ❌ No equipment/stringing services
- ❌ No payment processor variety

**Specialized Features:**
- ❌ No kiosk mode
- ❌ No tablet check-in stations
- ❌ No specialized sport features (stringing, etc.)

---

## 4. Prioritized Feature Roadmap

### 🔥 **P0 - Must-Have for SaaS Launch (MVP)**
*Club owners cannot operate without these features*

1. **Multi-Tenant Architecture** - Core SaaS requirement
2. **Organization/Club Entity Model** - Separate club data & settings
3. **Membership Tiers & Management** - Basic member vs non-member pricing
4. **Recurring Membership Billing** - Monthly/annual membership payments
5. **Enhanced User Role Management** - Club owners, staff, members, guests
6. **Public Booking Pages** - Shareable links for guest bookings
7. **Financial Reporting** - Revenue, bookings, membership revenue
8. **Email Marketing System** - Basic newsletters and announcements
9. **Waitlist Management** - Fill cancelled slots automatically
10. **Guest/Drop-in Management** - Handle non-member bookings with waivers

**Estimated Timeline:** 4-6 months  
**Business Impact:** Without these, clubs cannot fully operate or scale

### 🚀 **P1 - High Priority (Competitive Differentiators)**
*Features that make clubs choose Thirdshot over competitors*

11. **Automated Invoicing System** - Generate and send invoices
12. **Events & Tournament Management** - One-time and recurring events
13. **Lesson Booking & Instructor Management** - Private/group lessons
14. **SMS Notification System** - Critical for member communication
15. **Member Portal with Custom Branding** - White-label experience
16. **Mobile Push Notifications** - Keep members engaged
17. **Advanced Booking Rules** - Member-specific privileges and restrictions
18. **Pro Shop/POS Integration** - Additional revenue stream
19. **League Management System** - Basic league creation and management
20. **Comprehensive Analytics Dashboard** - Business insights and KPIs
21. **Batch Billing System** - Streamline recurring charges
22. **Self Check-in System** - QR codes and mobile check-in

**Estimated Timeline:** 6-9 months post-MVP  
**Business Impact:** Competitive positioning and member satisfaction

### 📈 **P2 - Medium Priority (Nice to Have)**
*Features that enhance the experience but aren't deal-breakers*

23. **Native Mobile Apps** (iOS/Android) - Better than PWA
24. **Player Match-Maker** - Help members find playing partners
25. **Prepaid Packages** - Court time packages with balance tracking
26. **Automated Match Scheduling** - For leagues and tournaments
27. **Score Tracking & Standings** - Competition management
28. **Member Directory** - Social networking features
29. **Kiosk Mode** - Tablet check-in stations
30. **Advanced Court Management** - Court types, amenities, equipment
31. **Multi-Location Support** - For club chains
32. **Automated Reminder System** - Reduce no-shows
33. **Digital Waivers & E-signatures** - Legal compliance
34. **API for Third-Party Integrations** - Extensibility

**Estimated Timeline:** 12-18 months post-MVP  
**Business Impact:** Enhanced user experience and operational efficiency

### 🔮 **P3 - Low Priority (Future Roadmap)**
*Features that can wait until market validation and scale*

35. **Access Control Integration** - Physical facility access
36. **Video Recording Integration** - Match replay services
37. **Ladder & Ranking Systems** - Advanced competition tracking
38. **Stringing/Equipment Services** - Specialized pro shop features
39. **Advanced Marketing Automation** - Behavioral triggers and sequences
40. **Custom Report Builder** - Advanced analytics
41. **Multi-Sport Support** - Tennis, padel, squash, etc.
42. **Offline Mobile Functionality** - Advanced PWA features
43. **AI-Powered Features** - Smart scheduling, player matching
44. **Advanced POS Features** - Inventory management, loyalty programs

**Estimated Timeline:** 18+ months post-MVP  
**Business Impact:** Market expansion and advanced differentiation

---

## Business Insights & Recommendations

### 🎯 **Critical Path to SaaS Viability**

1. **Focus on P0 Features First** - Without these, Thirdshot cannot compete
2. **Multi-Tenancy is THE Priority** - Single biggest architectural change needed
3. **Membership System is Table Stakes** - Clubs cannot operate without member tiers
4. **Financial Management is Revenue-Critical** - Clubs need billing and reporting

### 💰 **Revenue Model Insights**

**CourtReserve Pricing:** $199/month for "Grow" plan
- Includes premium features and financial tools
- Additional fees: SMS ($5/500 texts), Multi-location ($549/location)
- Free trial with guided setup

**Thirdshot Opportunity:** 
- Could undercut at $99-149/month for basic SaaS plan
- Freemium model for single courts
- Usage-based pricing for bookings/members

### 🚨 **Reality Check: Development Effort**

**Current State:** Thirdshot is ~15% of CourtReserve's feature set
**MVP Development:** 4-6 months of focused development
**Competitive Parity:** 12-18 months minimum
**Team Requirements:** 2-3 full-stack developers + 1 product manager

### 🎯 **Strategic Recommendations**

1. **Validate Market Fit First** - Test P0 features with 2-3 friendly clubs
2. **Consider Vertical Focus** - Start with pickleball-only to reduce scope
3. **Partner for Complex Features** - Integrate existing solutions instead of building
4. **Prioritize API-First Architecture** - Enable rapid integration development

---

## Conclusion

CourtReserve is a mature, comprehensive platform with 8+ years of development and feature refinement. Thirdshot has solid technical foundations but requires substantial development to compete as a SaaS offering.

**The Gap:** Approximately 40+ major features across 8 categories  
**The Opportunity:** Market is large and growing, especially in pickleball  
**The Challenge:** Significant development investment required for competitive parity  

**Recommended Approach:** Focus ruthlessly on P0 MVP features, validate with pilot customers, then expand systematically through P1 and P2 features based on market feedback.

---

**Document Version:** 1.0  
**Next Review:** After P0 feature prioritization meeting  
**Owner:** Sean (Thirdshot Founder)