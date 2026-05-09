# SEO Setup Guide for Iñaki Lozano Portfolio

This guide provides comprehensive instructions for setting up SEO optimization across your two domains: inakilozano.com and inakilozano.dev.

## 🎯 **Domain Strategy Decision**

### **RECOMMENDED: Single Primary Domain**
Choose ONE domain as your primary and redirect others to avoid duplicate content penalties:

**Best Options Ranked:**
1. **inakilozano.com** - Traditional and professional (Recommended Primary)
2. **inakilozano.dev** - Developer-focused branding

### **Multi-Domain Configuration (Advanced)**
If you need multiple domains, use this hierarchy:

```bash
# Primary domain (main portfolio)
NEXT_PUBLIC_APP_URL=https://inakilozano.com

# Alternative configurations per domain purpose:
# inakilozano.dev - Open source projects/blog
```

**⚠️ Important**: Each domain MUST have unique content to avoid SEO penalties.

## 📋 Sitemap And Robots Implementation

This project uses native Next.js metadata routes for sitemap and robots.txt generation.

### Configuration Files
- `app/sitemap.ts` - Dynamic sitemap route
- `app/robots.ts` - Robots route
- `NEXT_PUBLIC_APP_URL` - Canonical production base URL

### Features
- **Dynamic Content**: Fetches blog posts and projects from database
- **Priority Management**: Different priorities for different content types
- **Admin/API Protection**: Disallows admin and API paths
- **Auto-generation**: Runs automatically after `npm run build`

### Generated Files
- `/public/sitemap.xml` - Main sitemap
- `/robots.txt` - Robots.txt with crawl directives

## 🔧 Environment Variables Setup

Add these environment variables to your `.env.local` and production environments:

```bash
# Primary domain (change this for each deployment)
NEXT_PUBLIC_APP_URL=https://inakilozano.dev

# Google Search Console verification
GOOGLE_SITE_VERIFICATION=your-google-verification-code

# Bing Webmaster Tools verification
BING_SITE_VERIFICATION=your-bing-verification-code

# Yandex Webmaster verification  
YANDEX_SITE_VERIFICATION=your-yandex-verification-code

# Google Analytics (required for tracking)
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

## 🌐 Domain-Specific Setup

### For each domain, follow these steps:

1. **Deploy with domain-specific NEXT_PUBLIC_APP_URL**
2. **Set up Google Search Console**
3. **Configure DNS and domain verification**
4. **Submit sitemaps**

## 📊 Google Search Console Setup

### 1. Verify Domain Ownership

For each domain (inakilozano.com, inakilozano.dev):

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add your domain as a property
3. Choose verification method:
   - **HTML tag method**: Copy the verification code to `GOOGLE_SITE_VERIFICATION`
   - **DNS method**: Add TXT record to your DNS
   - **HTML file method**: Upload verification file to public directory

### 2. Submit Sitemaps

After verification, submit these sitemaps:
- `https://yourdomain.com/sitemap.xml`

### 3. Monitor Performance

- Check indexing status
- Monitor search queries
- Review Core Web Vitals
- Track click-through rates

## 🔍 Search Engine Optimization Features Implemented

### ✅ Technical SEO
- [x] **Structured Data (JSON-LD)**
  - Person schema for professional profile
  - Organization schema for business entity
  - Website schema with search action
  - Breadcrumb navigation schema

- [x] **Meta Tags & Open Graph**
  - Comprehensive title and description optimization
  - Open Graph tags for social media sharing
  - Twitter Card optimization
  - Canonical URLs across all domains

- [x] **Sitemap & Robots**
  - Dynamic sitemap including blog and project pages
  - Database-driven content inclusion
  - Optimized robots.txt for public crawling
  - Runtime sitemap route with proper priorities

### ✅ Performance Optimization
- [x] **Core Web Vitals**
  - Image optimization (WebP, AVIF formats)
  - Compression and caching headers
  - Bundle size optimization
  - Server-side rendering optimization

- [x] **Progressive Web App**
  - Enhanced web app manifest
  - App shortcuts for key sections
  - Offline capabilities preparation

### ✅ Analytics & Tracking
- [x] **Google Analytics 4**
  - Implemented with `afterInteractive` strategy for optimal performance
  - Placed in document head for early initialization
  - Automatic page view tracking
  - Enhanced ecommerce and conversion tracking ready
  - GDPR-compliant implementation

### ✅ Content SEO
- [x] **Keyword Optimization**
  - Long-tail keywords for developer portfolio
  - Technical skill-based keywords
  - Location and service-based terms
  - Brand name variations

- [x] **Content Structure**
  - Semantic HTML structure
  - Proper heading hierarchy
  - Accessible navigation
  - Mobile-first responsive design

## 🚀 Deployment Checklist

### Before Going Live

1. **Update Environment Variables**
   ```bash
   NEXT_PUBLIC_APP_URL=https://your-actual-domain.com
   GOOGLE_SITE_VERIFICATION=actual-verification-code
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```
   
   **Get Google Analytics ID:**
   - Go to [Google Analytics](https://analytics.google.com/)
   - Create a new property or use existing
   - Copy the Measurement ID (format: G-XXXXXXXXXX)

2. **Test SEO Implementation**
   - Validate structured data: [Google Rich Results Test](https://search.google.com/test/rich-results)
   - Check Open Graph: [OpenGraph.xyz](https://www.opengraph.xyz/)
   - Test mobile-friendliness: [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)

3. **Performance Audit**
   - Run Lighthouse audit
   - Check Core Web Vitals
   - Test loading speeds

### After Deployment

1. **Submit to Search Engines**
   - Google Search Console
   - Bing Webmaster Tools
   - Yandex Webmaster

2. **Monitor and Optimize**
   - Track indexing status
   - Monitor search rankings
   - Analyze user behavior
   - Update content regularly

## 📈 SEO Monitoring Tools

### Essential Tools
- **Google Search Console**: Search performance and indexing
- **Google Analytics 4**: User behavior, traffic analysis, and conversion tracking
- **Google PageSpeed Insights**: Performance monitoring
- **Lighthouse**: Comprehensive audit tool

### Google Analytics 4 Setup
1. **Create GA4 Property**
   - Visit [Google Analytics](https://analytics.google.com/)
   - Create new property with your domain
   - Copy Measurement ID (G-XXXXXXXXXX)

2. **Key Metrics to Monitor**
   - Page views and user sessions
   - Bounce rate and session duration
   - Traffic sources (organic, direct, referral)
   - Popular pages and content
   - User demographics and interests
   - Core Web Vitals integration

### Additional Tools
- **Ahrefs/SEMrush**: Keyword research and competitor analysis
- **Schema.org Validator**: Structured data validation
- **GTmetrix**: Performance testing
- **Screaming Frog**: Technical SEO audit

## 🎯 Local SEO (Optional)

If you provide local services, add this structured data:

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Iñaki F. Lozano - Full Stack Developer",
  "description": "Professional web development services",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "Your Country"
  },
  "areaServed": "Worldwide",
  "serviceArea": {
    "@type": "GeoCircle",
    "geoMidpoint": {
      "@type": "GeoCoordinates",
      "latitude": "Your Latitude",
      "longitude": "Your Longitude"
    },
    "geoRadius": "50000"
  }
}
```

## 🔧 Advanced Configuration

### Single Domain Strategy (RECOMMENDED)

Set up 301 redirects to consolidate SEO authority:

```nginx
# Nginx - Redirect to primary domain
server {
    server_name inakilozano.dev;
    return 301 https://inakilozano.com$request_uri;
}
```

```javascript
// Vercel - vercel.json
{
  "redirects": [
    {
      "source": "https://inakilozano.dev/:path*", 
      "destination": "https://inakilozano.com/:path*",
      "permanent": true
    }
  ]
}
```

### Multi-Domain Strategy (Advanced)

If using different domains for different purposes:

```bash
# Environment variables per deployment
# Domain 1: Main portfolio
NEXT_PUBLIC_APP_URL=https://inakilozano.com
GOOGLE_SITE_VERIFICATION=verification-code-1

# Domain 2: Technical blog
NEXT_PUBLIC_APP_URL=https://inakilozano.dev  
GOOGLE_SITE_VERIFICATION=verification-code-2
```

**Multi-Domain Content Strategy:**
- **inakilozano.com**: Professional portfolio, client work, resume
- **inakilozano.dev**: Technical blog, open source projects, tutorials

**Required for Multi-Domain:**
1. Unique content per domain (at least 70% different)
2. Different meta descriptions and titles
3. Separate Google Search Console properties
4. Cross-domain canonical links when appropriate

### CDN Configuration

For optimal performance with CDN (Cloudflare, AWS CloudFront):

1. Enable automatic HTTPS
2. Configure caching rules
3. Enable image optimization
4. Set up geographic distribution

## 📝 Content Strategy

### Blog SEO
- Write technical tutorials and insights
- Use long-tail keywords naturally
- Include code examples and practical solutions
- Maintain consistent publishing schedule

### Project Pages
- Include detailed case studies
- Showcase technologies used
- Add client testimonials (if applicable)
- Include live demos and GitHub links

### Regular Updates
- Keep skills and experience current
- Add new projects regularly
- Update blog with fresh content
- Monitor and improve based on analytics

## 🆘 Troubleshooting

### Common Issues

1. **Sitemap not found**
   - Check `/sitemap.xml` accessibility
   - Verify database connections for dynamic content
   - Check Docker runtime logs for sitemap generation errors
   - Verify `NEXT_PUBLIC_APP_URL` is set correctly in environment

2. **Structured data errors**
   - Use Google's Rich Results Test
   - Validate JSON-LD syntax

3. **Poor Core Web Vitals**
   - Optimize images and fonts
   - Minimize JavaScript bundles
   - Enable compression

### Support Resources
- [Google Search Central](https://developers.google.com/search)
- [Next.js SEO Documentation](https://nextjs.org/learn/seo/introduction-to-seo)
- [Schema.org Documentation](https://schema.org/)

---

**Note**: This implementation provides a solid foundation for SEO across all three domains. Remember to customize the content for each domain's specific purpose and audience.
