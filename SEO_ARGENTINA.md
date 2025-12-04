# SEO Enhancement for Argentina and Tucumán

## Overview
This document outlines the SEO enhancements made to improve visibility in Argentina, specifically in Tucumán province.

## Key Changes

### 1. **Metadata Enhancements** (`app/metadata.ts`)

#### Spanish Keywords Added:
- Desarrollador de Software
- Estudiante de Ingeniería en Computación
- Desarrollo Backend
- Desarrollo de APIs
- Firmas electrónicas avanzadas
- Arquitecturas escalables

#### Location-Specific Keywords:
- Software Developer Argentina
- Desarrollador Tucumán
- Desarrollador Argentina
- Software Engineer Tucumán
- Ingeniero en Computación Tucumán
- Tribunal de Cuentas Tucumán
- Tech Tucumán
- Tecnología Argentina
- Developer NOA
- Desarrollador NOA Argentina

#### Geo-Location Meta Tags:
```html
<meta name="geo.region" content="AR-T" />
<meta name="geo.placename" content="Tucumán" />
<meta name="geo.position" content="-26.8241;-65.2226" />
<meta name="ICBM" content="-26.8241, -65.2226" />
```

### 2. **Language Alternates**
Added proper hreflang tags for Spanish (Argentina) and English:
- `es-AR` for Spanish (Argentina)
- `en-US` for English
- `x-default` for default fallback

### 3. **Structured Data (Schema.org)**

#### LocalBusiness Schema
Added comprehensive LocalBusiness schema for local SEO:
```json
{
  "@type": "LocalBusiness",
  "name": "Iñaki F. Lozano - Desarrollador de Software",
  "address": {
    "addressLocality": "San Miguel de Tucumán",
    "addressRegion": "Tucumán",
    "addressCountry": "AR"
  },
  "geo": {
    "latitude": "-26.8241",
    "longitude": "-65.2226"
  },
  "areaServed": ["Argentina", "Tucumán", "San Miguel de Tucumán"]
}
```

#### Enhanced Person Schema
- Added `address` field with Tucumán location
- Updated `worksFor` to include full address of Court of Accounts of Tucumán
- Localized content based on language (Spanish/English)

#### Organization Schema
- Updated `areaServed` to specifically mention Argentina and Tucumán
- Added bilingual support for all text fields
- Included `availableLanguage` in contact point

### 4. **Spanish Metadata** (`metadataES`)
Created complete Spanish metadata export with:
- Spanish title and descriptions
- `es_AR` locale for Open Graph
- Argentina and Tucumán specific keywords
- Same geo-location tags

### 5. **Sitemap Considerations**
The existing sitemap configuration (`next-sitemap.config.js`) should be updated to include:
- `/es/` routes for all pages
- `/en/` routes for all pages
- Proper priority for Spanish content pages

### 6. **Spanish Dictionary** (`dictionaries/es.json`)
Added SEO section with:
- Localized title
- Localized description
- Spanish keywords
- Location reference
- Organization name in Spanish

## SEO Best Practices Implemented

### For Argentina/Tucumán:
1. **Geo-targeting**: Added precise geolocation coordinates for Tucumán
2. **Local Keywords**: Included "NOA" (Northwest Argentina) references
3. **Bilingual Content**: Full Spanish and English support
4. **LocalBusiness Schema**: Helps with Google Maps and local search
5. **Proper Locale Tags**: `es-AR` specifically targets Argentina

### Technical SEO:
1. **Hreflang Tags**: Proper language alternates prevent duplicate content issues
2. **Canonical URLs**: Each language version has its canonical URL
3. **Structured Data**: Multiple schema types (Person, Organization, LocalBusiness, BreadcrumbList)
4. **Open Graph**: Language-specific OG tags for social media sharing

## Google Search Console Recommendations

### 1. Verify Both Language Versions
- Submit both `/en/` and `/es/` sitemaps
- Monitor performance for Argentina specifically

### 2. Google Business Profile
Consider creating a Google Business Profile for "Iñaki F. Lozano - Software Developer" with:
- Location: Tucumán, Argentina
- Category: Software Company / Computer Services
- Description in Spanish
- Link to website

### 3. Monitor Geo-Performance
Track performance in Google Search Console for:
- Argentina country filter
- Spanish language queries
- Tucumán-specific searches

### 4. Local Link Building
- Argentine tech communities
- Tucumán developer groups
- NOA tech events
- University connections (if applicable)

## Content Recommendations

### Spanish Blog Posts
Create content targeting Argentine developers:
- "Desarrollo de Software en Tucumán"
- "DevOps en el NOA"
- "Firmas Electrónicas en Argentina"
- "Backend Development Best Practices (Spanish)"

### Location Pages
Consider adding:
- `/es/tucuman` - Specific page about Tucumán services
- `/es/argentina` - Argentine market focus page

## Monitoring & Analytics

### Key Metrics to Track:
1. **Organic Traffic from Argentina**
2. **Spanish vs English page views**
3. **Keyword rankings for**:
   - "desarrollador tucumán"
   - "software developer argentina"
   - "ingeniero computación tucumán"
   - "tribunal de cuentas tucumán"
4. **Local search performance**

### Tools:
- Google Search Console (Country & Language filters)
- Google Analytics 4 (Geo reports)
- Schema Markup Validator
- Hreflang validator

## Implementation Checklist

- [x] Spanish metadata added
- [x] Geo-location tags implemented
- [x] LocalBusiness schema added
- [x] Hreflang alternates configured
- [x] Language-aware structured data
- [x] Spanish dictionary updated
- [ ] Regenerate sitemap with language routes
- [ ] Submit to Google Search Console
- [ ] Create Google Business Profile
- [ ] Add Spanish content pages
- [ ] Monitor performance in Argentina

## Next Steps

1. **Regenerate Sitemap**: Run `npm run postbuild` to regenerate the sitemap with new language routes
2. **Test Structured Data**: Use [Google's Rich Results Test](https://search.google.com/test/rich-results)
3. **Verify Hreflang**: Use [hreflang testing tools](https://www.aleydasolis.com/english/international-seo-tools/hreflang-tags-generator/)
4. **Submit to Search Engines**: 
   - Google Search Console
   - Bing Webmaster Tools
5. **Create Local Content**: Add blog posts in Spanish targeting Argentine audience
