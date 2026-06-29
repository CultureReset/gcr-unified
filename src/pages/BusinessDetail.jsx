import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_BASE } from '../config'
import ReviewsSection from '../components/ReviewsSection'
import TeamSection from '../components/TeamSection'
import GallerySection from '../components/GallerySection'
import BlogSection from '../components/BlogSection'
import PoliciesSection from '../components/PoliciesSection'
import BookingCalendar from '../components/BookingCalendar'
import './BusinessDetail.css'
import '../components/MiniSiteComponents.css'

export default function RestaurantDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [activeTab, setActiveTab] = useState(null)
  const [activeSubSection, setActiveSubSection] = useState(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [galleryPage, setGalleryPage] = useState(0)
  const [reviewsPage, setReviewsPage] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [hasTeam, setHasTeam] = useState(false)
  const [hasBlog, setHasBlog] = useState(false)
  const [hasPolicies, setHasPolicies] = useState(false)
  const [saved, setSaved] = useState(false)
  const [availability, setAvailability] = useState(null)
  const subSectionRefs = useRef({})
  const observerRef = useRef(null)

  useEffect(() => {
    async function loadBusiness() {
      try {
        const res = await fetch(`${API_BASE}/api/gcr/entity/${encodeURIComponent(slug)}`)
        if (!res.ok) throw new Error('Failed to load business')
        const data = await res.json()
        if (!data || !data.slug) throw new Error('Business not found')
        setBusiness(data)
        const et = (data.entity_type || '').toLowerCase()
        const isFood = ['restaurant','coffee','dessert','bakery','bar'].includes(et)
        const rotating = data.rotating_sections || data.rotatingSections || []
        const hasMenuData = data.menu_sections?.length || rotating.some(r => r.type !== 'drinks') || data.areas?.some(a => a.menu_sections?.length)
        const hasDrinksData = data.drink_sections?.length || rotating.some(r => r.type === 'drinks') || data.areas?.some(a => a.drink_sections?.length)
        const hasSpecialsData = data.specials?.length || data.daily_features?.length || data.dailyFeatures?.length || data.sides?.length || data.areas?.some(a => a.specials?.length)
        const hasOfferingsData = (data.sections || []).some(s => (s.items || []).length > 0)
        const hasPricing = data.pricing?.length > 0
        const hasSchedules = data.schedules?.length > 0
        // Default tab: for food types start on menu/offerings; for activities start on pricing or overview
        let defaultTab = 'overview'
        if (hasOfferingsData) defaultTab = 'offerings'
        else if (isFood && hasMenuData) defaultTab = 'menu'
        else if (hasPricing) defaultTab = 'pricing'
        else if (hasSchedules) defaultTab = 'schedule'
        setActiveTab(defaultTab)

        // Preload counts for conditional tabs
        Promise.all([
          fetch(`${API_BASE}/api/reviews/${encodeURIComponent(slug)}/stats`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE}/api/team/${encodeURIComponent(slug)}`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE}/api/blog/${encodeURIComponent(slug)}?page=1&limit=1`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE}/api/faqs/${encodeURIComponent(slug)}?category=cancellation`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE}/api/email-parser/availability/${encodeURIComponent(slug)}`).then(r => r.ok ? r.json() : null).catch(() => null),
        ]).then(([reviewStats, teamData, blogData, policiesData, availData]) => {
          if (reviewStats?.total) setReviewCount(reviewStats.total)
          if ((teamData?.team || []).length > 0) setHasTeam(true)
          if ((blogData?.posts || []).length > 0) setHasBlog(true)
          if ((policiesData?.faqs || []).length > 0) setHasPolicies(true)
          if (availData?.availability?.length > 0) setAvailability(availData)
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadBusiness()
  }, [slug])

  useEffect(() => {
    if (!business?.photos?.length) return
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % business.photos.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [business?.photos?.length])

  // IntersectionObserver: highlight active sub-section chip as user scrolls
  useEffect(() => {
    observerRef.current?.disconnect()
    const els = Object.entries(subSectionRefs.current)
    if (!els.length) return
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gcr-header-h') || '148')
    observerRef.current = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length) setActiveSubSection(visible[0].target.dataset.secid)
      },
      { rootMargin: `-${headerH + 105}px 0px -60% 0px`, threshold: 0 }
    )
    els.forEach(([, el]) => el && observerRef.current.observe(el))
    return () => observerRef.current?.disconnect()
  }, [activeTab, business])

  const scrollToSubSection = useCallback((id) => {
    const el = subSectionRefs.current[id]
    if (!el) return
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gcr-header-h') || '148')
    const tabsH = 100
    const top = el.getBoundingClientRect().top + window.scrollY - headerH - tabsH
    window.scrollTo({ top, behavior: 'smooth' })
    setActiveSubSection(id)
  }, [])

  if (loading) return <div className="detail-page"><div className="loading">Loading...</div></div>
  if (error) return <div className="detail-page"><div className="error">Error: {error}</div></div>
  if (!business) return <div className="detail-page"><div className="error">Business not found</div></div>

  const photos = business.photos || []
  const hours = (business.hours || []).sort((a, b) => (a.day_of_week ?? 0) - (b.day_of_week ?? 0))
  const GOOGLE_TYPE_NOISE = new Set(['establishment','point_of_interest','food','restaurant','bar','cafe','store','premise','locality','political','sublocality','neighborhood'])
  const seen = new Set()
  const tags = (business.tags || []).filter(t => {
    const name = (t.tag_name || '').toLowerCase().replace(/[\s-]+/g, '_')
    if (GOOGLE_TYPE_NOISE.has(name)) return false
    if (seen.has(name)) return false
    seen.add(name)
    return true
  })
  const events = business.events || []
  const pricing = business.pricing || []
  const whatsIncluded = business.whats_included || []
  const whatToBring = business.what_to_bring || []
  const activityDetails = business.activity_details || null
  const orderLinks = business.order_links || []
  const faqs = business.faqs || []
  const requirements = business.requirements || []
  const schedules = business.schedules || []
  // Flexible offerings (entity_sections) — used for rentals, charters, tours, etc.
  const flexSections = (business.sections || [])
    .filter(s => (s.items || []).length > 0)
    .map(s => ({ ...s, items: [...s.items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) }))
  const hasOfferings = flexSections.length > 0

  // Rich menu data
  const rotating = business.rotating_sections || business.rotatingSections || []
  const foodRotating = rotating.filter(r => r.type !== 'drinks')
  const drinkRotating = rotating.filter(r => r.type === 'drinks')
  const allAreas = business.areas || []
  const flatMenuSections = [
    ...(business.menu_sections || []),
    ...allAreas.flatMap(a => a.menu_sections || [])
  ]
  const flatDrinkSections = [
    ...(business.drink_sections || []),
    ...allAreas.flatMap(a => a.drink_sections || [])
  ]
  const allSpecials = [
    ...(business.specials || []),
    ...allAreas.flatMap(a => a.specials || []),
  ]
  const sides = business.sides || []
  const dailyFeatures = business.daily_features || business.dailyFeatures || []

  const MEAL_ORDER = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Late Night', 'All Day']

  const getMealPeriod = (sec) => {
    const n = (sec.section_name || sec.name || '').toLowerCase()
    if (n.includes('breakfast')) return 'Breakfast'
    if (n.includes('brunch')) return 'Brunch'
    if (n.includes('lunch')) return 'Lunch'
    if (n.includes('dinner') || n.includes('supper')) return 'Dinner'
    if (n.includes('late night') || n.includes('late-night')) return 'Late Night'
    const tr = sec.time_range || ''
    if (tr) {
      const startH = parseInt((tr.split('-')[0] || '').split(':')[0] || '0')
      if (startH < 10) return 'Breakfast'
      if (startH < 12) return 'Brunch'
      if (startH < 15) return 'Lunch'
      if (startH >= 17) return 'Dinner'
    }
    return 'All Day'
  }

  const groupByMealPeriod = (secs) => {
    const groups = {}
    secs.forEach(sec => {
      const p = getMealPeriod(sec)
      if (!groups[p]) groups[p] = []
      groups[p].push(sec)
    })
    return MEAL_ORDER.filter(p => groups[p]).map(p => ({ period: p, sections: groups[p] }))
  }

  const menuGroups = groupByMealPeriod(flatMenuSections)

  const renderMenuItem = (item, i) => {
    const name = item.item_name || item.name
    const price = item.price != null ? item.price : null
    const priceStr = price != null
      ? (typeof price === 'string' ? price : (price % 1 === 0 ? `$${price}` : `$${parseFloat(price).toFixed(2)}`))
      : null
    const images = item.images || []
    return (
      <div key={item.id || i} className="menu-item">
        {images[0]?.url && (
          <img src={images[0].url} alt={images[0].label || name} className="menu-item-img" />
        )}
        <div className="item-body">
          <div className="item-header">
            <span className="item-name">{name}</span>
            {priceStr && <span className="item-price">{priceStr}</span>}
          </div>
          {item.description && <p className="item-desc">{item.description}</p>}
          {item.available_days && <p className="item-days">{item.available_days}</p>}
        </div>
      </div>
    )
  }
  // API returns photos with .url, normalize to .image_url for carousel
  const slides = photos.length > 0
    ? photos.map(p => ({ ...p, image_url: p.image_url || p.url }))
    : [{ image_url: business.hero_image_url }]

  const todayIdx = new Date().getDay()
  const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][todayIdx]

  const formatTime = (time) => {
    if (!time) return null
    if (time.includes('am') || time.includes('pm')) return time
    const [h, m] = time.split(':').map(Number)
    return `${(h % 12 || 12)}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`
  }

  // Open/closed status
  const todayHours = hours.find(h => h.day_of_week === todayIdx)
  const openStatus = (() => {
    if (!todayHours) return null
    if (todayHours.is_closed) return { open: false, label: 'Closed today' }
    const now = new Date()
    const toMins = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const nowMins = now.getHours() * 60 + now.getMinutes()
    const openMins = toMins(todayHours.opens_at)
    const closeMins = toMins(todayHours.closes_at)
    if (openMins == null) return null
    if (nowMins < openMins) return { open: false, label: `Opens at ${formatTime(todayHours.opens_at)}` }
    if (closeMins && nowMins > closeMins) return { open: false, label: `Closed · Opens ${today}` }
    return { open: true, label: `Open · Closes ${formatTime(todayHours.closes_at) || 'late'}` }
  })()

  const entityType = (business.entity_type || '').toLowerCase()
  const isFood = ['restaurant','coffee','dessert','bakery','bar'].includes(entityType)
  const isStay = ['hotel','condo','vacation-rental'].includes(entityType)
  const isActivity = entityType === 'activity'
  const isService = entityType === 'service'
  const isShopping = entityType === 'shopping'
  const isPark = entityType === 'park'

  const hasActivityExtras = business.highlights?.length || business.known_for?.length || business.good_for?.length || business.what_makes_it_different

  const hasMenu = flatMenuSections.length > 0 || foodRotating.length > 0
  const hasDrinks = flatDrinkSections.length > 0 || drinkRotating.length > 0
  const hasSpecials = allSpecials.length > 0 || dailyFeatures.length > 0 || sides.length > 0
  const hasHH = !!(business.hh_days || business.hh_sections?.length || business.happy_hour_sections?.length)

  // Industry-specific data from API
  const roomTypes = business.room_types || []
  const amenities = business.amenities || []
  const propertyFees = business.property_fees || []
  const stayLinks = business.stay_links || []
  const propertyDetails = business.property_details || null
  const serviceCategories = business.service_categories || []
  const serviceMenu = business.service_menu || []
  const servicePackages = business.service_packages || []
  const classSchedule = business.class_schedule || []
  const productCategories = business.product_categories || []
  const products = business.products || []
  const facilities = business.facilities || []
  const spotRules = business.spot_rules || []
  const accessInfo = business.access_info || null
  const meetingPoints = business.meeting_points || []
  const activityOptions = business.activity_options || []
  const fishSpecies = business.fish_species || []
  const loyaltyProgram = business.loyalty_program || null
  const announcements = business.announcements || []
  const socialPosts = business.social_posts || []
  const hasSocialPosts = socialPosts.length > 0
  const bookableResources = business.bookable_resources || []

  // Has-data flags for new tabs
  const hasRooms = roomTypes.length > 0
  const hasServices = serviceMenu.length > 0 || serviceCategories.length > 0 || servicePackages.length > 0 || classSchedule.length > 0
  const hasProducts = products.length > 0
  const hasParkInfo = facilities.length > 0 || spotRules.length > 0 || accessInfo
  const hasMeetingPoints = meetingPoints.length > 0
  const hasFishSpecies = fishSpecies.length > 0
  const hasActivityOptions = activityOptions.length > 0
  const hasAmenities = amenities.length > 0

  const sections = [
    // Data-driven — show if data exists regardless of type
    ...(hasOfferings                     ? [{ id: 'offerings',   label: 'Offerings',    icon: '🎟️' }] : []),
    ...(pricing.length                   ? [{ id: 'pricing',     label: 'Pricing',      icon: '💰' }] : []),
    ...(schedules.length                 ? [{ id: 'schedule',    label: 'Schedule',     icon: '🗓️' }] : []),
    // Food tabs
    ...((isFood || hasMenu)   ? (hasMenu    ? [{ id: 'menu',       label: 'Menu',        icon: '🍽️' }] : []) : []),
    ...((isFood || hasDrinks) ? (hasDrinks  ? [{ id: 'drinks',     label: 'Drinks',      icon: '🍷' }] : []) : []),
    ...((isFood || hasSpecials)? (hasSpecials?[{ id: 'specials',   label: 'Specials',    icon: '⭐' }] : []) : []),
    ...((isFood || hasHH)     ? (hasHH      ? [{ id: 'happy-hour', label: 'Happy Hour',  icon: '🍺' }] : []) : []),
    // Stay tabs
    ...(hasRooms      ? [{ id: 'rooms',     label: 'Rooms',        icon: '🛏️' }] : []),
    ...(hasAmenities  ? [{ id: 'amenities', label: 'Amenities',    icon: '✨' }] : []),
    ...(stayLinks.length ? [{ id: 'book-stay', label: 'Book / Links', icon: '🔗' }] : []),
    // Service tabs
    ...(hasServices   ? [{ id: 'services',  label: 'Services',     icon: '💆' }] : []),
    // Shop tabs
    ...(hasProducts   ? [{ id: 'products',  label: 'Products',     icon: '🛍️' }] : []),
    // Park tabs
    ...(hasParkInfo   ? [{ id: 'park-info', label: 'Park Info',    icon: '🌳' }] : []),
    // Activity extras
    ...(hasMeetingPoints  ? [{ id: 'meeting',  label: 'Meeting Point', icon: '📌' }] : []),
    ...(hasFishSpecies    ? [{ id: 'fish',     label: 'Fish Species',  icon: '🐟' }] : []),
    // Common
    ...(hours.length  ? [{ id: 'hours',     label: 'Hours',        icon: '🕐' }] : []),
    ...(events.length ? [{ id: 'events',    label: 'Events',       icon: '🎉' }] : []),
    { id: 'overview',   label: 'Overview',   icon: 'ℹ️' },
    ...(hasActivityExtras ? [{ id: 'experience', label: 'Experience', icon: '🎯' }] : []),
    ...(faqs.length   ? [{ id: 'faqs',      label: 'FAQs',         icon: '❓' }] : []),
    { id: 'reviews', label: reviewCount > 0 ? `Reviews (${reviewCount})` : 'Reviews', icon: '⭐' },
    ...(hasTeam     ? [{ id: 'team',     label: 'Team',     icon: '👥' }] : []),
    ...(hasBlog        ? [{ id: 'blog',     label: 'Blog',     icon: '📰' }] : []),
    ...(hasSocialPosts ? [{ id: 'social',   label: 'Social',   icon: '📱' }] : []),
    ...(hasPolicies ? [{ id: 'policies', label: 'Policies', icon: '📋' }] : []),
    { id: 'location', label: 'Location', icon: '📍' },
    ...(photos.length ? [{ id: 'gallery', label: `Photos (${photos.length})`, icon: '📸' }] : []),
  ]

  // Sub-section chips — meal period groups for menu, section names for drinks/happy-hour
  const subSections = activeTab === 'menu'
    ? [
        ...(foodRotating.length ? [{ id: 'menu-rotating', label: "Today's Features" }] : []),
        ...menuGroups.map(g => ({ id: `menu-period-${g.period}`, label: g.period }))
      ]
    : activeTab === 'drinks'
    ? [
        ...(drinkRotating.length ? [{ id: 'drinks-rotating', label: 'On Tap / Featured' }] : []),
        ...flatDrinkSections.map(s => ({ id: `drink-sec-${s.id || s.section_name || s.name}`, label: s.section_name || s.name }))
      ]
    : activeTab === 'happy-hour'
    ? (business.hh_sections || business.happy_hour_sections || []).map(s => ({ id: `hh-sec-${s.id || s.section_name}`, label: s.section_name || s.name }))
    : []

  const GALLERY_PER_PAGE = 10
  const REVIEWS_PER_PAGE = 10
  const galleryTotal = Math.ceil((photos?.length || 0) / GALLERY_PER_PAGE)
  const reviewsTotal = reviewCount

  const handleShareBusiness = () => {
    const businessUrl = `${window.location.origin}/business/${business.slug}`

    if (navigator.share) {
      navigator.share({
        title: business.name,
        text: `Check out ${business.name} on Gulf Coast Radar`,
        url: businessUrl
      }).catch(() => {})
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(businessUrl)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <div className="detail-page">
      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div style={{display:'flex',gap:8}}>
          <button className={`save-btn-detail ${saved ? 'saved' : ''}`} onClick={() => setSaved(s => !s)} title={saved ? 'Saved' : 'Save'}>
            {saved ? '❤️' : '🤍'}
          </button>
          <button className="share-btn" onClick={handleShareBusiness} title="Share this business">📤 Share</button>
        </div>
      </div>

      {/* Photo Carousel */}
      <div className="carousel-wrap">
        <div className="carousel">
          {slides.map((photo, idx) => (
            <div
              key={idx}
              className={`carousel-slide ${idx === currentSlide ? 'active' : ''}`}
            >
              <img
                src={photo.image_url || photo.url || ''}
                alt=""
                className="carousel-slide-img"
                onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1504674900968-08049c043914?w=600&q=80' }}
                loading="lazy"
              />
            </div>
          ))}
          <div className="carousel-overlay" />

          {slides.length > 1 && (
            <>
              <button className="carousel-arrow carousel-prev" onClick={() => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length)}>
                &#8249;
              </button>
              <button className="carousel-arrow carousel-next" onClick={() => setCurrentSlide(prev => (prev + 1) % slides.length)}>
                &#8250;
              </button>
              <div className="carousel-dots">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    className={`dot ${idx === currentSlide ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(idx)}
                  />
                ))}
              </div>
              <div className="carousel-count">{currentSlide + 1} / {slides.length}</div>
            </>
          )}

          {/* Image feature chips */}
          {(() => {
            const tagStrs = (business.tags || []).map(t => (typeof t === 'string' ? t : (t.tag_name || '')).toLowerCase().replace(/[\s-]+/g,'_'))
            const chips = [
              (business.live_music || tagStrs.some(t => t.includes('live_music'))) && { cls: 'chip-music', label: '🎸 Live Music' },
              (business.waterfront || tagStrs.includes('waterfront')) && { cls: 'chip-water', label: '🌊 Waterfront' },
              (business.outdoor_seating || tagStrs.includes('outdoor_seating')) && { cls: 'chip-outdoor', label: '🌿 Outdoor' },
              business.hh_days && { cls: 'chip-hh', label: '🍺 Happy Hour' },
            ].filter(Boolean)
            return chips.length ? (
              <div className="carousel-img-chips">
                {chips.map((c,i) => <span key={i} className={`carousel-img-chip ${c.cls}`}>{c.label}</span>)}
              </div>
            ) : null
          })()}

          {/* Hero Text */}
          <div className="carousel-hero">
            <div className="hero-name">{business.name}</div>
            <div className="hero-meta">
              {business.rating && (
                <span className="hero-rating">
                  ★ {business.rating.toFixed(1)} {business.review_count && `(${business.review_count})`}
                </span>
              )}
              {business.city && <span>📍 {business.city}, {business.state}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Permanently Closed Banner */}
      {business.business_status === 'CLOSED_PERMANENTLY' && (
        <div className="closed-permanently-banner">
          ⚠️ This business is permanently closed
        </div>
      )}

      {/* Announcement Banner */}
      {announcements.length > 0 && announcements.filter(a => a.active).map(a => (
        <div key={a.id} className={`announcement-banner announcement-${a.type || 'banner'}`}>
          {a.message}
        </div>
      ))}

      {/* Happy Hour Banner */}
      {business.hh_days && (
        <div className="hh-banner">
          🍺 <span className="hh-badge">Happy Hour</span> {business.hh_days}
        </div>
      )}

      {/* Header Section */}
      <div className="business-header">
        <h1>{business.name}</h1>
        {business.subtitle && <p className="subtitle">{business.subtitle}</p>}

        {/* Open/closed status + today's hours */}
        {openStatus && (
          <div className={`open-status ${openStatus.open ? 'open' : 'closed'}`}>
            <span className="open-dot" />
            {openStatus.label}
            {todayHours && !todayHours.is_closed && openStatus.open && todayHours.opens_at && (
              <span className="open-hours-today"> · {formatTime(todayHours.opens_at)}–{formatTime(todayHours.closes_at)}</span>
            )}
          </div>
        )}

        {business.city && <p className="meta">📍 {business.city}, {business.state}</p>}
        {business.rating && <p className="meta">⭐ {business.rating} ({business.review_count || 0} reviews)</p>}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="badge-row">
            {tags.map(tag => (
              <span key={tag.tag_name} className="badge">{tag.tag_name}</span>
            ))}
          </div>
        )}

        {/* Primary CTA — type-aware labels */}
        {(() => {
          const et = (business.entity_type || '').toLowerCase()
          const isFood = ['restaurant','coffee','dessert','bakery','bar'].includes(et)
          const isShopping = et === 'shopping'
          const isActivity = et === 'activity'
          const isStay = ['hotel','condo','vacation-rental'].includes(et)
          const isService = et === 'service'
          const reserveLabel = isFood ? '🍽️ Make a Reservation' : isStay ? '🛏️ Check Availability' : '📅 Reserve a Spot'
          const bookLabel = isActivity ? '🎟️ Book This Activity' : isService ? '📅 Schedule Service' : isShopping ? '🛍️ Shop Online' : '📅 Book Now'
          return (business.reservation_url || business.order_url || business.booking_url) ? (
            <div className="primary-cta">
              {business.reservation_url && (
                <a href={business.reservation_url} target="_blank" rel="noopener noreferrer" className="btn-primary-cta">{reserveLabel}</a>
              )}
              {business.order_url && (
                <a href={business.order_url} target="_blank" rel="noopener noreferrer" className="btn-primary-cta">
                  {isFood ? '🛵 Order Online' : '🛒 Order / Buy'}
                </a>
              )}
              {business.booking_url && !business.reservation_url && (
                <a href={business.booking_url} target="_blank" rel="noopener noreferrer" className="btn-primary-cta">{bookLabel}</a>
              )}
            </div>
          ) : null
        })()}

        {/* Secondary Action Buttons */}
        <div className="action-buttons">
          {business.phone && (
            <a href={`tel:${business.phone}`} className="btn btn-call">📞 Call</a>
          )}
          {business.directions_url && (
            <a href={business.directions_url} target="_blank" rel="noopener noreferrer" className="btn btn-directions">
              📍 Directions
            </a>
          )}
          {business.menu_url && (
            <a href={business.menu_url} target="_blank" rel="noopener noreferrer" className="btn btn-menu">
              📄 Menu
            </a>
          )}
          {business.website_url && (
            <a href={business.website_url} target="_blank" rel="noopener noreferrer" className="btn btn-website">
              🌐 Website
            </a>
          )}
          {loyaltyProgram && (
            <a
              href={`sms:${loyaltyProgram.sms_number}?body=Text%20${loyaltyProgram.keyword}%20to%20join`}
              className="btn btn-loyalty"
            >
              🎁 Join Loyalty
            </a>
          )}
        </div>

        {/* Social Links */}
        {(business.social_instagram || business.social_facebook || business.social_tiktok) && (
          <div className="social-links">
            {business.social_instagram && (
              <a href={business.social_instagram.startsWith('http') ? business.social_instagram : `https://instagram.com/${business.social_instagram}`} target="_blank" rel="noopener noreferrer" className="social-btn social-instagram">
                Instagram
              </a>
            )}
            {business.social_facebook && (
              <a href={business.social_facebook} target="_blank" rel="noopener noreferrer" className="social-btn social-facebook">
                Facebook
              </a>
            )}
            {business.social_tiktok && (
              <a href={business.social_tiktok.startsWith('http') ? business.social_tiktok : `https://tiktok.com/@${business.social_tiktok}`} target="_blank" rel="noopener noreferrer" className="social-btn social-tiktok">
                TikTok
              </a>
            )}
          </div>
        )}
      </div>

      {/* Sticky Tabs */}
      <div className="sticky-tabs">
        <div className="tabs-scroll">
          {sections.map(sec => (
            <button
              key={sec.id}
              className={`tab ${activeTab === sec.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(sec.id); setActiveSubSection(null) }}
            >
              {sec.icon} {sec.label}
            </button>
          ))}
        </div>
        {subSections.length > 0 && (
          <div className="subsection-chips-row">
            {subSections.map(ss => (
              <button
                key={ss.id}
                className={`subsection-chip ${activeSubSection === ss.id ? 'active' : ''}`}
                onClick={() => scrollToSubSection(ss.id)}
              >
                {ss.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Layout */}
      <div className="content-layout">
        <main className="content-main">
          {/* Overview */}
          {activeTab === 'overview' && (
            <section className="content-section">
              <h2>About</h2>
              {business.description && <p>{business.description}</p>}
              {!business.description && business.editorial_summary && <p>{business.editorial_summary}</p>}
              {business.ai_overview && (
                <div className="ai-summary">
                  <p>{business.ai_overview}</p>
                </div>
              )}
              {business.ai_review_summary && (
                <div className="ai-review-summary">
                  <h3>What Visitors Say</h3>
                  <p>{business.ai_review_summary}</p>
                </div>
              )}

              {/* ── LIVE AVAILABILITY WIDGET ── */}
              {availability && availability.availability?.length > 0 && (() => {
                const today = new Date().toISOString().slice(0,10)
                const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0,10)
                const slots = availability.availability.filter(s =>
                  s.availability_date === today || s.availability_date === tomorrow
                )
                if (!slots.length) return null
                return (
                  <div className="avail-widget">
                    <div className="avail-widget-head">
                      <span className="avail-pulse" />
                      <span className="avail-title">Live Availability</span>
                      <span className="avail-updated">Updated in real-time</span>
                    </div>
                    <div className="avail-slots">
                      {slots.map((slot, i) => {
                        const isToday = slot.availability_date === today
                        const label = isToday ? 'Today' : 'Tomorrow'
                        const time = slot.time_slot ? slot.time_slot.slice(0,5) : null
                        const fmt = t => {
                          if (!t) return ''
                          const [h, m] = t.split(':').map(Number)
                          return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`
                        }
                        return (
                          <div key={i} className={`avail-slot avail-slot--${slot.status}`}>
                            <div className="avail-slot-when">
                              <span className="avail-slot-day">{label}</span>
                              {time && <span className="avail-slot-time">{fmt(time)}</span>}
                            </div>
                            <div className="avail-slot-status">
                              {slot.status === 'full' && <span className="avail-tag avail-tag--full">🔴 Full</span>}
                              {slot.status === 'limited' && (
                                <span className="avail-tag avail-tag--limited">
                                  🟡 {slot.remaining_spots} spot{slot.remaining_spots !== 1 ? 's' : ''} left
                                </span>
                              )}
                              {slot.status === 'available' && (
                                <span className="avail-tag avail-tag--open">
                                  🟢 {slot.remaining_spots != null ? `${slot.remaining_spots} open` : 'Available'}
                                </span>
                              )}
                              {slot.status === 'unknown' && (
                                <span className="avail-tag avail-tag--unknown">📊 Tracking</span>
                              )}
                            </div>
                            {slot.total_capacity && slot.remaining_spots != null && (
                              <div className="avail-bar-wrap">
                                <div
                                  className="avail-bar-fill"
                                  style={{ width: `${Math.min(100, ((slot.total_capacity - slot.remaining_spots) / slot.total_capacity) * 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {business.booking_url && (
                      <a href={business.booking_url} target="_blank" rel="noopener noreferrer" className="avail-book-btn">
                        📅 Book Now — Before It's Gone
                      </a>
                    )}
                  </div>
                )
              })()}

              {/* Type-aware features/amenities */}
              {(() => {
                const et = (business.entity_type || '').toLowerCase()
                const isFood = ['restaurant','coffee','dessert','bakery','bar'].includes(et)
                const isActivity = et === 'activity'
                const isStay = ['hotel','condo','vacation-rental'].includes(et)
                const isShopping = et === 'shopping'
                const isPark = et === 'park'

                // Activity / charter / tour quick-facts
                if (isActivity) {
                  const facts = [
                    business.duration_text       && { icon: '⏱', label: business.duration_text },
                    business.price_from != null   && { icon: '💵', label: `From $${business.price_from}${business.price_unit ? ' / ' + business.price_unit : ''}` },
                    business.good_for_groups     && { icon: '👥', label: 'Good for Groups' },
                    business.good_for_children   && { icon: '👶', label: 'Kid Friendly' },
                    business.allows_dogs         && { icon: '🐕', label: 'Dog Friendly' },
                    business.outdoor_seating     && { icon: '🌊', label: 'Outdoors' },
                    business.reservable          && { icon: '📅', label: 'Reservations Available' },
                    business.wheelchair_accessible_entrance && { icon: '♿', label: 'Accessible' },
                  ].filter(Boolean)
                  if (!facts.length) return null
                  return (
                    <div className="amenities-section">
                      <h3>Quick Facts</h3>
                      <div className="amenities-grid">
                        {facts.map((a, i) => <div key={i} className="amenity-item">{a.icon} {a.label}</div>)}
                      </div>
                    </div>
                  )
                }

                // Stay quick-facts
                if (isStay) {
                  const facts = [
                    business.bedrooms  && { icon: '🛏️', label: `${business.bedrooms} Bedroom${business.bedrooms !== 1 ? 's' : ''}` },
                    business.bathrooms && { icon: '🚿', label: `${business.bathrooms} Bathroom${business.bathrooms !== 1 ? 's' : ''}` },
                    business.sqft      && { icon: '📐', label: `${business.sqft.toLocaleString()} sqft` },
                    business.good_for_groups     && { icon: '👥', label: 'Good for Groups' },
                    business.good_for_children   && { icon: '👶', label: 'Kid Friendly' },
                    business.allows_dogs         && { icon: '🐕', label: 'Pet Friendly' },
                    business.outdoor_seating     && { icon: '🌊', label: 'Waterfront' },
                    business.reservable          && { icon: '📅', label: 'Bookable Online' },
                    business.wheelchair_accessible_entrance && { icon: '♿', label: 'Accessible' },
                  ].filter(Boolean)
                  if (!facts.length) return null
                  return (
                    <div className="amenities-section">
                      <h3>Property Details</h3>
                      <div className="amenities-grid">
                        {facts.map((a, i) => <div key={i} className="amenity-item">{a.icon} {a.label}</div>)}
                      </div>
                    </div>
                  )
                }

                // Shopping / park / service — generic features only
                if (isShopping || isPark || et === 'service') {
                  const facts = [
                    business.outdoor_seating   && { icon: '🌿', label: 'Outdoor' },
                    business.good_for_groups   && { icon: '👥', label: 'Good for Groups' },
                    business.good_for_children && { icon: '👶', label: 'Kid Friendly' },
                    business.allows_dogs       && { icon: '🐕', label: 'Dog Friendly' },
                    business.reservable        && { icon: '📅', label: 'Appointments Available' },
                    business.wheelchair_accessible_entrance && { icon: '♿', label: 'Accessible Entrance' },
                  ].filter(Boolean)
                  if (!facts.length) return null
                  return (
                    <div className="amenities-section">
                      <h3>Features</h3>
                      <div className="amenities-grid">
                        {facts.map((a, i) => <div key={i} className="amenity-item">{a.icon} {a.label}</div>)}
                      </div>
                    </div>
                  )
                }

                // Food types — full restaurant amenities
                if (isFood) {
                  const amenities = [
                    business.dine_in           && { icon: '🍽️', label: 'Dine-in' },
                    business.takeout           && { icon: '🥡', label: 'Takeout' },
                    business.delivery          && { icon: '🛵', label: 'Delivery' },
                    business.curbside_pickup   && { icon: '🚗', label: 'Curbside Pickup' },
                    business.reservable        && { icon: '📅', label: 'Reservations' },
                    business.outdoor_seating   && { icon: '🌿', label: 'Outdoor Seating' },
                    business.live_music        && { icon: '🎸', label: 'Live Music' },
                    business.good_for_groups   && { icon: '👥', label: 'Good for Groups' },
                    business.good_for_children && { icon: '👶', label: 'Kid Friendly' },
                    business.allows_dogs       && { icon: '🐕', label: 'Dog Friendly' },
                    business.good_for_watching_sports && { icon: '📺', label: 'Sports Bar' },
                    business.serves_breakfast  && { icon: '🍳', label: 'Breakfast' },
                    business.serves_brunch     && { icon: '🥂', label: 'Brunch' },
                    business.serves_lunch      && { icon: '🥗', label: 'Lunch' },
                    business.serves_dinner     && { icon: '🍷', label: 'Dinner' },
                    business.serves_beer       && { icon: '🍺', label: 'Beer' },
                    business.serves_wine       && { icon: '🍷', label: 'Wine' },
                    business.serves_cocktails  && { icon: '🍹', label: 'Cocktails' },
                    business.serves_coffee     && { icon: '☕', label: 'Coffee' },
                    business.serves_dessert    && { icon: '🍰', label: 'Dessert' },
                    business.serves_vegetarian && { icon: '🥦', label: 'Vegetarian Options' },
                    business.wheelchair_accessible_entrance && { icon: '♿', label: 'Accessible Entrance' },
                    business.wheelchair_accessible_parking  && { icon: '♿', label: 'Accessible Parking' },
                    business.wheelchair_accessible_restroom && { icon: '♿', label: 'Accessible Restroom' },
                  ].filter(Boolean)
                  if (!amenities.length) return null
                  return (
                    <div className="amenities-section">
                      <h3>Amenities & Features</h3>
                      <div className="amenities-grid">
                        {amenities.map((a, i) => <div key={i} className="amenity-item">{a.icon} {a.label}</div>)}
                      </div>
                    </div>
                  )
                }

                // Fallback — generic
                const facts = [
                  business.good_for_groups   && { icon: '👥', label: 'Good for Groups' },
                  business.good_for_children && { icon: '👶', label: 'Kid Friendly' },
                  business.allows_dogs       && { icon: '🐕', label: 'Dog Friendly' },
                  business.outdoor_seating   && { icon: '🌿', label: 'Outdoor' },
                  business.reservable        && { icon: '📅', label: 'Reservations' },
                  business.wheelchair_accessible_entrance && { icon: '♿', label: 'Accessible' },
                ].filter(Boolean)
                if (!facts.length) return null
                return (
                  <div className="amenities-section">
                    <h3>Features</h3>
                    <div className="amenities-grid">
                      {facts.map((a, i) => <div key={i} className="amenity-item">{a.icon} {a.label}</div>)}
                    </div>
                  </div>
                )
              })()}

              {business.price_level && (
                <div className="price-level-row">
                  <h3>Price Level</h3>
                  <span>{'💰'.repeat(Math.min(business.price_level, 4))}</span>
                  {business.price_range_low && business.price_range_high && (
                    <span className="price-range-text"> (${business.price_range_low}–${business.price_range_high})</span>
                  )}
                </div>
              )}

              {(() => {
                const hasPropertyDetails = business.bedrooms || business.bathrooms || business.sqft;
                if (!hasPropertyDetails) return null;
                return (
                  <div className="property-details-row">
                    <h3>Property Details</h3>
                    <div className="property-specs">
                      {business.bedrooms && <span className="spec">🛏️ {business.bedrooms} bed{business.bedrooms !== 1 ? 's' : ''}</span>}
                      {business.bathrooms && <span className="spec">🚿 {business.bathrooms} bath{business.bathrooms !== 1 ? 's' : ''}</span>}
                      {business.sqft && <span className="spec">📐 {business.sqft.toLocaleString()} sqft</span>}
                    </div>
                  </div>
                );
              })()}

              {business.google_maps_uri && (
                <a href={business.google_maps_uri} target="_blank" rel="noopener noreferrer" className="google-maps-link" onClick={e => e.stopPropagation()}>
                  🗺️ View on Google Maps
                </a>
              )}

              {tags.length > 0 && (
                <div>
                  <h3>Categories</h3>
                  <div className="tag-row">
                    {tags.map(tag => (
                      <span key={tag.tag_name} className="tag">{tag.tag_name}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Experience */}
          {activeTab === 'experience' && (
            <section className="content-section">
              {business.what_makes_it_different && (
                <div className="exp-block">
                  <h2>What Makes It Different</h2>
                  <p>{business.what_makes_it_different}</p>
                </div>
              )}
              {business.highlights?.length > 0 && (
                <div className="exp-block">
                  <h2>What You'll See</h2>
                  <ul className="exp-list">
                    {business.highlights.map((h, i) => <li key={i}>✓ {h}</li>)}
                  </ul>
                </div>
              )}
              {business.known_for?.length > 0 && (
                <div className="exp-block">
                  <h2>Known For</h2>
                  <div className="tag-row">
                    {business.known_for.map((k, i) => <span key={i} className="tag">{k}</span>)}
                  </div>
                </div>
              )}
              {business.good_for?.length > 0 && (
                <div className="exp-block">
                  <h2>Good For</h2>
                  <div className="tag-row">
                    {business.good_for.map((g, i) => <span key={i} className="tag">{g}</span>)}
                  </div>
                </div>
              )}
              {(business.duration_text || business.price_from != null) && (
                <div className="exp-block">
                  <h2>Trip Details</h2>
                  {business.duration_text && <p>⏱ Duration: {business.duration_text}</p>}
                  {business.price_from != null && (
                    <p>💵 From ${business.price_from}{business.price_unit ? ` / ${business.price_unit}` : ''}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Happy Hour */}
          {activeTab === 'happy-hour' && (
            <section className="content-section">
              <h2>🍺 Happy Hour</h2>
              {business.hh_days && (
                <p className="hh-schedule">
                  {business.hh_days}
                  {business.hh_start && ` · ${formatTime(business.hh_start)}`}
                  {business.hh_end && ` – ${formatTime(business.hh_end)}`}
                </p>
              )}
              {business.hh_description && <p>{business.hh_description}</p>}
              {(business.hh_sections || business.happy_hour_sections || []).map(sec => (
                <div key={sec.id} className="menu-section" style={{marginTop: 20}}>
                  <h3>{sec.section_name || sec.name}</h3>
                  <div className="menu-items">
                    {(sec.items || sec.happy_hour_items || []).map(item => (
                      <div key={item.id} className="menu-item">
                        <div className="item-header">
                          <span className="item-name">{item.item_name || item.name}</span>
                          {(item.hh_price ?? item.price) != null && (
                            <span className="item-price hh-price">${(item.hh_price ?? item.price)}</span>
                          )}
                        </div>
                        {item.description && <p className="item-desc">{item.description}</p>}
                        {item.original_price != null && (
                          <p className="item-original-price">Was ${item.original_price}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Pricing */}
          {activeTab === 'offerings' && (
            <section className="content-section">
              {flexSections.map((sec) => (
                <div key={sec.id} className="offering-section">
                  <h2>{sec.section_name}</h2>
                  <div className="offering-grid">
                    {sec.items.map((item) => {
                      const m = item.metadata || {}
                      const priceText = item.price_from != null
                        ? (item.price_to != null
                            ? `$${item.price_from}–$${item.price_to}`
                            : `$${item.price_from}`)
                        : (item.price_label || 'Ask Us')
                      const includes = Array.isArray(m.includes) ? m.includes : []
                      const features = Array.isArray(m.features) ? m.features : []
                      return (
                        <div key={item.id} className="offering-card">
                          <div className="offering-head">
                            <span className="offering-icon">{item.icon || '•'}</span>
                            <span className="offering-name">{item.item_name}</span>
                            <span className="offering-price">{priceText}</span>
                          </div>
                          {(item.price_label || item.duration) && (
                            <div className="offering-meta">
                              {item.price_label && item.price_from != null && <span className="offering-label">{item.price_label}</span>}
                              {item.duration && <span className="offering-duration">⏱ {item.duration}</span>}
                            </div>
                          )}
                          {item.description && <p className="offering-desc">{item.description}</p>}
                          {includes.length > 0 && (
                            <div className="offering-includes">
                              {includes.map((inc, k) => <span key={k} className="offering-chip">✓ {inc}</span>)}
                            </div>
                          )}
                          {features.length > 0 && (
                            <div className="offering-includes">
                              {features.map((f, k) => <span key={k} className="offering-chip feature">★ {f}</span>)}
                            </div>
                          )}
                          {(m.requires || m.deposit || m.ages || m.note) && (
                            <div className="offering-notes">
                              {m.ages && <span>👥 {m.ages}</span>}
                              {m.requires && <span>🪪 {m.requires}</span>}
                              {m.deposit && <span>💵 Deposit {m.deposit}</span>}
                              {m.note && <span>ℹ️ {m.note}</span>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </section>
          )}

          {activeTab === 'pricing' && (
            <section className="content-section">
              <h2>💰 Pricing</h2>
              {pricing.length === 0 ? (
                <p className="no-data">No pricing info available</p>
              ) : (
                <div className="pricing-list">
                  {pricing.map((item, i) => {
                    // Support both real DB schema (item_name, price) and extended schema (tier_name, price_from/to)
                    const name = item.tier_name || item.item_name
                    const priceVal = item.price_from ?? item.price
                    const priceDisplay = priceVal != null
                      ? (item.price_to != null && item.price_to !== priceVal
                          ? `$${priceVal}–$${item.price_to}`
                          : `$${priceVal}`)
                      : 'Call for pricing'
                    const isFree = priceVal === 0
                    return (
                      <div key={item.id || i} className="pricing-row">
                        <div className="pricing-name">
                          {name}
                          {item.minimum_age != null && priceVal === 0 && (
                            <span className="pricing-age-note"> (under {item.minimum_age} free)</span>
                          )}
                          {item.minimum_age != null && priceVal !== 0 && (
                            <span className="pricing-age-note"> (ages {item.minimum_age}+)</span>
                          )}
                        </div>
                        <div className="pricing-right">
                          <span className={`pricing-price${isFree ? ' pricing-free' : ''}`}>
                            {isFree ? 'FREE' : priceDisplay}
                          </span>
                          {item.price_label && !isFree && (
                            <span className="pricing-label"> {item.price_label}</span>
                          )}
                          {item.duration && (
                            <div className="pricing-duration">⏱ {item.duration}</div>
                          )}
                          {item.description && <div className="pricing-desc">{item.description}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {whatsIncluded.length > 0 && (
                <div className="whats-included">
                  <h3>✅ What's Included</h3>
                  <ul>
                    {whatsIncluded.map((item, i) => (
                      <li key={item.id || i}>
                        {item.icon && <span>{item.icon} </span>}
                        {item.included_item || item.item_name}
                        {item.description && <span className="included-desc"> — {item.description}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {requirements.length > 0 && (
                <div className="requirements-list">
                  <h3>📋 Requirements</h3>
                  <ul>
                    {requirements.map((item, i) => (
                      <li key={item.id || i}>
                        {item.requirement_text || item.requirement_name}
                        {item.description && <span className="req-desc"> — {item.description}</span>}
                        {item.applies_to && item.applies_to !== 'all' && (
                          <span className="req-applies"> ({item.applies_to})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What to Bring */}
              {whatToBring.length > 0 && (
                <div className="what-to-bring">
                  <h3>🎒 What to Bring</h3>
                  <ul>
                    {whatToBring.map((item, i) => (
                      <li key={item.id || i}>{item.item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Activity Details — duration, difficulty, trip notes */}
              {activityDetails && (
                <div className="activity-details-block">
                  {activityDetails.duration_hours && (
                    <div className="act-detail-row">⏱ <strong>Duration:</strong> {activityDetails.duration_hours} hours</div>
                  )}
                  {activityDetails.difficulty && (
                    <div className="act-detail-row">📊 <strong>Difficulty:</strong> {activityDetails.difficulty}</div>
                  )}
                  {activityDetails.min_age && (
                    <div className="act-detail-row">👤 <strong>Min Age:</strong> {activityDetails.min_age}+</div>
                  )}
                  {activityDetails.group_size_max && (
                    <div className="act-detail-row">👥 <strong>Max Group:</strong> {activityDetails.group_size_max} people</div>
                  )}
                  {activityDetails.notes && (
                    <div className="act-detail-row act-notes">{activityDetails.notes}</div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* FAQs */}
          {activeTab === 'faqs' && (
            <section className="content-section">
              <h2>❓ Frequently Asked Questions</h2>
              {faqs.length === 0 ? (
                <p className="no-data">No FAQs available</p>
              ) : (
                <div className="faqs-list">
                  {faqs.map((faq, i) => (
                    <div key={faq.id || i} className="faq-row">
                      <div className="faq-question">{faq.question}</div>
                      <div className="faq-answer">{faq.answer}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Events */}
          {activeTab === 'events' && (
            <section className="content-section">
              <h2>🎉 Events</h2>
              {events.length === 0 ? (
                <p className="no-data">No upcoming events</p>
              ) : (
                <>
                  {/* Unique artist images — deduplicated by image_url */}
                  {(() => {
                    const seen = new Set()
                    const artists = events.filter(ev => {
                      if (!ev.image_url) return false
                      if (seen.has(ev.image_url)) return false
                      seen.add(ev.image_url)
                      return true
                    })
                    return artists.length > 0 ? (
                      <div className="artist-grid">
                        {artists.map(ev => (
                          <div key={ev.image_url} className="artist-card">
                            <img src={ev.image_url} alt={ev.artist_name || ev.event_name} className="artist-card-img" />
                            {ev.artist_name && <div className="artist-card-name">{ev.artist_name}</div>}
                          </div>
                        ))}
                      </div>
                    ) : null
                  })()}

                  {(() => {
                    const todayStr = new Date().toISOString().split('T')[0]
                    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]
                    const groups = {}
                    const noDate = []
                    events.forEach(ev => {
                      if (!ev.event_date) { noDate.push(ev); return }
                      if (!groups[ev.event_date]) groups[ev.event_date] = []
                      groups[ev.event_date].push(ev)
                    })
                    const sortedDates = Object.keys(groups).sort()
                    const dateLabel = d => {
                      if (d === todayStr) return 'Today'
                      if (d === tomorrowStr) return 'Tomorrow'
                      return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                    }
                    return (
                      <div className="events-list">
                        {sortedDates.map(date => (
                          <div key={date} className="event-date-group">
                            <div className="event-date-heading">{dateLabel(date)}</div>
                            {groups[date].map((ev, i) => (
                              <div key={ev.id || i} className="event-row">
                                <div className="event-row-info">
                                  <div className="event-row-name">{ev.event_name || ev.name}</div>
                                  {ev.artist_name && (
                                    ev.artist_slug
                                      ? <div className="event-row-artist" style={{cursor:'pointer',color:'var(--gcr-teal,#0a8472)',textDecoration:'underline'}} onClick={(e)=>{e.stopPropagation();navigate('/artist/'+ev.artist_slug)}}>🎤 {ev.artist_name} →</div>
                                      : <div className="event-row-artist">🎤 {ev.artist_name}</div>
                                  )}
                                  {(ev.start_time || ev.end_time) && (
                                    <div className="event-row-time">
                                      {formatTime(ev.start_time)}{ev.end_time ? ` – ${formatTime(ev.end_time)}` : ''}
                                    </div>
                                  )}
                                  {ev.cover_charge != null && ev.cover_charge > 0 && (
                                    <div className="event-row-cover">Cover: ${ev.cover_charge}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                        {noDate.map((ev, i) => (
                          <div key={ev.id || i} className="event-row">
                            <div className="event-row-info">
                              <div className="event-row-name">{ev.event_name || ev.name}</div>
                              {ev.artist_name && (
                                    ev.artist_slug
                                      ? <div className="event-row-artist" style={{cursor:'pointer',color:'var(--gcr-teal,#0a8472)',textDecoration:'underline'}} onClick={(e)=>{e.stopPropagation();navigate('/artist/'+ev.artist_slug)}}>🎤 {ev.artist_name} →</div>
                                      : <div className="event-row-artist">🎤 {ev.artist_name}</div>
                                  )}
                              {ev.recurring && ev.day_of_week && <div className="event-row-time">Every {ev.day_of_week}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </>
              )}
            </section>
          )}

          {/* Schedule (activity departure times / tour schedules) */}
          {activeTab === 'schedule' && schedules.length > 0 && (
            <section className="content-section">
              <h2>🗓️ Schedule & Departures</h2>
              {(() => {
                const grouped = schedules.reduce((acc, s) => {
                  const key = s.schedule_type || s.label || 'Schedule'
                  if (!acc[key]) acc[key] = []
                  acc[key].push(s)
                  return acc
                }, {})
                return Object.entries(grouped).map(([type, items]) => (
                  <div key={type} className="schedule-group">
                    {Object.keys(grouped).length > 1 && (
                      <h3 className="schedule-type">{type.replace(/_/g, ' ')}</h3>
                    )}
                    <div className="schedule-list">
                      {items.map((s, i) => (
                        <div key={s.id || i} className="schedule-row">
                          <div className="schedule-label">{s.label || s.name || s.schedule_name}</div>
                          <div className="schedule-time">
                            {s.time_start && formatTime(s.time_start)}
                            {s.time_end && ` – ${formatTime(s.time_end)}`}
                          </div>
                          {s.days_of_week && (
                            <div className="schedule-days">{s.days_of_week}</div>
                          )}
                          {s.duration && (
                            <div className="schedule-duration">⏱ {s.duration}</div>
                          )}
                          {s.notes && <div className="schedule-notes">{s.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              })()}
            </section>
          )}

          {/* Hours */}
          {activeTab === 'hours' && hours.length > 0 && (
            <section className="content-section">
              <h2>Hours</h2>
              <ul className="hours-list">
                {hours.map((hr, idx) => (
                  <li key={idx} className={hr.day_of_week === new Date().getDay() ? 'today' : ''}>
                    <span className="day">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][hr.day_of_week || 0]}
                    </span>
                    <span className="time">
                      {hr.is_closed
                        ? 'Closed'
                        : `${formatTime(hr.opens_at) || '—'} – ${formatTime(hr.closes_at) || '—'}`}
                    </span>
                  </li>
                ))}
              </ul>
              {business.secondary_hours?.length > 0 && (() => {
                const grouped = (business.secondary_hours || []).reduce((acc, h) => {
                  const key = h.hours_type || 'Other'
                  if (!acc[key]) acc[key] = []
                  acc[key].push(h)
                  return acc
                }, {})
                const typeLabels = {
                  delivery: '🛵 Delivery Hours',
                  tour_departures: '⛵ Tour Departures',
                  pickups: '🚗 Pickup Hours',
                  kitchen_hours: '🍳 Kitchen Hours',
                }
                return Object.entries(grouped).map(([type, hrs]) => (
                  <div key={type} className="secondary-hours-group">
                    <h3>{typeLabels[type] || type.replace(/_/g, ' ')}</h3>
                    <ul className="hours-list">
                      {hrs.filter(h => h.is_active !== false).map((hr, idx) => (
                        <li key={idx}>
                          <span className="day">
                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][hr.day_of_week || 0]}
                          </span>
                          <span className="time">
                            {hr.is_closed
                              ? 'Closed'
                              : `${formatTime(hr.opens_at) || '—'} – ${formatTime(hr.closes_at) || '—'}`}
                          </span>
                          {hr.description && <span className="hours-note">{hr.description}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              })()}
            </section>
          )}

          {/* Location */}
          {activeTab === 'location' && (
            <section className="content-section">
              <h2>Location</h2>
              <p className="address">
                📍 {business.address_line_1}<br />
                {[business.city, business.state, business.zip].filter(Boolean).join(', ')}
              </p>
              {business.directions_url && (
                <a href={business.directions_url} target="_blank" rel="noopener noreferrer" className="btn btn-directions">
                  📍 Get Directions
                </a>
              )}
            </section>
          )}

          {/* Gallery */}
          {activeTab === 'gallery' && (
            <section className="content-section">
              <h2>Photos ({photos.length})</h2>
              <div className="gallery-grid-preview">
                {photos.slice(galleryPage * GALLERY_PER_PAGE, (galleryPage + 1) * GALLERY_PER_PAGE).map((photo, idx) => (
                  <img
                    key={idx}
                    src={photo.image_url || photo.url}
                    alt={photo.caption || business.name}
                    className="gallery-preview-img"
                    onClick={() => { setGalleryOpen(true); setGalleryPage(Math.floor((galleryPage * GALLERY_PER_PAGE + idx) / GALLERY_PER_PAGE)) }}
                  />
                ))}
              </div>
              {galleryTotal > 1 && (
                <div className="gallery-pagination">
                  <button disabled={galleryPage === 0} onClick={() => setGalleryPage(p => p - 1)}>← Prev</button>
                  <span>{galleryPage + 1} / {galleryTotal}</span>
                  <button disabled={galleryPage >= galleryTotal - 1} onClick={() => setGalleryPage(p => p + 1)}>Next →</button>
                </div>
              )}
            </section>
          )}

          {/* Reviews */}
          {activeTab === 'reviews' && <ReviewsSection slug={slug} />}

          {/* Team */}
          {activeTab === 'team' && <TeamSection slug={slug} />}

          {/* Blog */}
          {activeTab === 'blog' && <BlogSection slug={slug} />}

          {/* Policies */}
          {activeTab === 'policies' && <PoliciesSection slug={slug} />}

          {/* Menu */}
          {activeTab === 'menu' && (
            <section className="content-section">
              <h2>🍽️ Menu</h2>

              {/* Today's Features — rotating food sections (Catch of the Day, Daily Special, etc.) */}
              {foodRotating.length > 0 && (
                <div
                  className="menu-period-group"
                  data-secid="menu-rotating"
                  ref={el => { subSectionRefs.current['menu-rotating'] = el }}
                >
                  <div className="meal-period-header">
                    <span className="meal-period-label">⭐ Today's Features</span>
                  </div>
                  {foodRotating.map(rot => (
                    <div key={rot.id} className="menu-section">
                      <h3>{rot.name}</h3>
                      <div className="menu-items">
                        {(rot.items || []).filter(it => it.active !== false).map((item, i) => renderMenuItem(item, i))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Meal period groups */}
              {menuGroups.length > 0 ? menuGroups.map(({ period, sections: grpSections }) => {
                const periodId = `menu-period-${period}`
                return (
                  <div
                    key={period}
                    className="menu-period-group"
                    data-secid={periodId}
                    ref={el => { subSectionRefs.current[periodId] = el }}
                  >
                    <div className="meal-period-header">
                      <span className="meal-period-label">
                        {{ Breakfast: '🍳', Brunch: '🥂', Lunch: '🥗', Dinner: '🍷', 'Late Night': '🌙', 'All Day': '🍽️' }[period] || '🍽️'} {period}
                      </span>
                    </div>
                    {grpSections.map(section => {
                      const secId = `menu-sec-${section.id || section.section_name || section.name}`
                      const timeRange = section.time_range
                      const days = section.available_days
                      return (
                        <div
                          key={secId}
                          className="menu-section menu-section-anchor"
                          data-secid={secId}
                          ref={el => { subSectionRefs.current[secId] = el }}
                        >
                          <div className="section-header-row">
                            <h3>{section.section_name || section.name}</h3>
                            {(timeRange || days) && (
                              <span className="section-meta">
                                {timeRange && `${formatTime(timeRange.split('-')[0])}–${formatTime(timeRange.split('-')[1])}`}
                                {days && ` · ${days}`}
                              </span>
                            )}
                          </div>
                          <div className="menu-items">
                            {(section.items || []).map((item, i) => renderMenuItem(item, i))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }) : !foodRotating.length && (
                <p className="no-data">No menu available</p>
              )}
            </section>
          )}

          {/* Drinks */}
          {activeTab === 'drinks' && (
            <section className="content-section">
              <h2>🍷 Drinks</h2>

              {/* On tap / featured rotating drinks (Beer on Tap, etc.) */}
              {drinkRotating.length > 0 && (
                <div
                  className="menu-period-group"
                  data-secid="drinks-rotating"
                  ref={el => { subSectionRefs.current['drinks-rotating'] = el }}
                >
                  <div className="meal-period-header">
                    <span className="meal-period-label">🍺 On Tap &amp; Featured</span>
                  </div>
                  {drinkRotating.map(rot => (
                    <div key={rot.id} className="menu-section">
                      <h3>{rot.name}</h3>
                      <div className="menu-items">
                        {(rot.items || []).filter(it => it.active !== false).map((item, i) => renderMenuItem(item, i))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {flatDrinkSections.length > 0 ? flatDrinkSections.map(section => {
                const secId = `drink-sec-${section.id || section.section_name || section.name}`
                const timeRange = section.time_range
                const days = section.available_days
                return (
                  <div
                    key={secId}
                    className="menu-section menu-section-anchor"
                    data-secid={secId}
                    ref={el => { subSectionRefs.current[secId] = el }}
                  >
                    <div className="section-header-row">
                      <h3>{section.section_name || section.name}</h3>
                      {(timeRange || days) && (
                        <span className="section-meta">
                          {timeRange && `${formatTime(timeRange.split('-')[0])}–${formatTime(timeRange.split('-')[1])}`}
                          {days && ` · ${days}`}
                        </span>
                      )}
                    </div>
                    <div className="menu-items">
                      {(section.items || []).map((item, i) => renderMenuItem(item, i))}
                    </div>
                  </div>
                )
              }) : !drinkRotating.length && (
                <p className="no-data">No drink menu available</p>
              )}
              {/* Order Links — DoorDash, UberEats, direct online order */}
              {orderLinks.length > 0 && (
                <div className="order-links-section">
                  <h3>🛵 Order Online</h3>
                  <div className="order-links-grid">
                    {orderLinks.map((link, i) => (
                      <a
                        key={link.id || i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="order-link-btn"
                      >
                        {link.label || link.type || 'Order Now'}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Specials */}
          {activeTab === 'specials' && (
            <section className="content-section">
              <h2>⭐ Specials</h2>

              {dailyFeatures.length > 0 && (
                <div className="menu-section" style={{marginBottom: 24}}>
                  <h3>Daily Features</h3>
                  <div className="menu-items">
                    {dailyFeatures.map((item, i) => renderMenuItem(item, i))}
                  </div>
                </div>
              )}

              {allSpecials.length > 0 && (
                <div className="menu-section" style={{marginBottom: 24}}>
                  <h3>Today's Specials</h3>
                  <div className="menu-items">
                    {allSpecials.map((item, i) => renderMenuItem(item, i))}
                  </div>
                </div>
              )}

              {sides.length > 0 && (
                <div className="menu-section">
                  <h3>Sides &amp; Add-Ons</h3>
                  <div className="menu-items">
                    {sides.map((item, i) => renderMenuItem(item, i))}
                  </div>
                </div>
              )}

              {!dailyFeatures.length && !allSpecials.length && !sides.length && (
                <p className="no-data">No specials right now</p>
              )}
            </section>
          )}

          {/* SOCIAL FEED */}
          {activeTab === 'social' && (
            <section className="content-section">
              <h2>📱 Social Feed</h2>
              <div className="social-feed-grid">
                {socialPosts.map(post => (
                  <a
                    key={post.id}
                    href={post.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-feed-card"
                  >
                    {post.image_url
                      ? <img src={post.image_url} alt={post.card_title || 'Post'} className="social-feed-img" />
                      : <div className="social-feed-placeholder">
                          {post.source === 'instagram' ? '📸' : '📘'}
                        </div>
                    }
                    <div className="social-feed-body">
                      <span className="social-feed-source">
                        {post.source === 'instagram' ? '📸 Instagram' : post.source === 'facebook' ? '📘 Facebook' : '📱 Social'}
                      </span>
                      {post.caption && <p className="social-feed-caption">{post.caption.slice(0, 120)}{post.caption.length > 120 ? '…' : ''}</p>}
                      <span className="social-feed-link">View post →</span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* ROOMS — Hotel / Condo / Vacation Rental */}
          {activeTab === 'rooms' && (
            <section className="content-section">
              <h2>🛏️ Rooms & Units</h2>
              {propertyDetails && (
                <div className="property-meta-row">
                  {propertyDetails.check_in_time && <span>Check-in: {propertyDetails.check_in_time}</span>}
                  {propertyDetails.check_out_time && <span>Check-out: {propertyDetails.check_out_time}</span>}
                  {propertyDetails.total_rooms && <span>{propertyDetails.total_rooms} rooms</span>}
                  {propertyDetails.star_rating && <span>{'⭐'.repeat(Math.round(propertyDetails.star_rating))}</span>}
                </div>
              )}
              {roomTypes.length === 0 ? (
                <p className="no-data">No room types listed yet</p>
              ) : (
                <div className="room-list">
                  {roomTypes.map((room, i) => (
                    <div key={room.id || i} className="room-card">
                      <div className="room-head">
                        <span className="room-name">{room.name}</span>
                        {room.price_per_night != null && (
                          <span className="room-price">${room.price_per_night}<span className="room-unit">/night</span></span>
                        )}
                      </div>
                      <div className="room-specs">
                        {room.beds && <span>🛏️ {room.beds}</span>}
                        {room.sleeps && <span>👥 Sleeps {room.sleeps}</span>}
                        {room.bedrooms && <span>🚪 {room.bedrooms} bed{room.bedrooms !== 1 ? 's' : ''}</span>}
                        {room.bathrooms && <span>🚿 {room.bathrooms} bath</span>}
                        {room.sqft && <span>📐 {room.sqft.toLocaleString()} sqft</span>}
                        {room.view && <span>🌊 {room.view}</span>}
                        {room.floor && <span>🏢 {room.floor}</span>}
                      </div>
                      {room.description && <p className="room-desc">{room.description}</p>}
                    </div>
                  ))}
                </div>
              )}
              {propertyFees.length > 0 && (
                <div className="fees-section">
                  <h3>Fees</h3>
                  {propertyFees.map((fee, i) => (
                    <div key={fee.id || i} className="fee-row">
                      <span>{fee.name}{!fee.mandatory && ' (optional)'}</span>
                      <span>${fee.amount} {fee.type?.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* AMENITIES — Hotel / Stay */}
          {activeTab === 'amenities' && (
            <section className="content-section">
              <h2>✨ Amenities</h2>
              {amenities.length === 0 ? (
                <p className="no-data">No amenities listed yet</p>
              ) : (
                <>
                  {/* Group by category */}
                  {(() => {
                    const grouped = amenities.reduce((acc, a) => {
                      const cat = a.category || 'General'
                      if (!acc[cat]) acc[cat] = []
                      acc[cat].push(a)
                      return acc
                    }, {})
                    return Object.entries(grouped).map(([cat, items]) => (
                      <div key={cat} className="amenity-group">
                        {Object.keys(grouped).length > 1 && <h3>{cat}</h3>}
                        <div className="amenities-grid">
                          {items.map((a, i) => (
                            <div key={a.id || i} className="amenity-item">
                              {a.icon && <span>{a.icon} </span>}
                              {a.name}
                              {a.is_shared === false && <span className="amenity-badge">In-unit</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </>
              )}
            </section>
          )}

          {/* BOOK / STAY LINKS */}
          {activeTab === 'book-stay' && (
            <section className="content-section">
              <h2>🔗 Book This Property</h2>
              <div className="stay-links-list">
                {stayLinks.map((link, i) => (
                  <a key={link.id || i} href={link.url} target="_blank" rel="noopener noreferrer" className="stay-link-btn">
                    {link.label} →
                  </a>
                ))}
              </div>
              {bookableResources.length > 0 && (
                <div style={{marginTop:20}}>
                  <h3>Available Units</h3>
                  {bookableResources.map((r, i) => (
                    <div key={r.id || i} className="bookable-row">
                      <span>{r.name}</span>
                      {r.capacity && <span>👥 {r.capacity}</span>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* SERVICES — Salon / Spa / Gym / Service */}
          {activeTab === 'services' && (
            <section className="content-section">
              <h2>💆 Services</h2>
              {servicePackages.length > 0 && (
                <div className="packages-section">
                  <h3>Packages</h3>
                  <div className="package-list">
                    {servicePackages.map((pkg, i) => (
                      <div key={pkg.id || i} className="package-card">
                        <div className="package-head">
                          <span className="package-name">{pkg.name}</span>
                          {pkg.price != null && <span className="package-price">${pkg.price}</span>}
                        </div>
                        {pkg.description && <p className="package-desc">{pkg.description}</p>}
                        {pkg.includes?.length > 0 && (
                          <ul className="package-includes">
                            {pkg.includes.map((inc, j) => <li key={j}>✓ {inc}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {serviceCategories.length > 0 ? (
                serviceCategories.map(cat => {
                  const catServices = serviceMenu.filter(s => s.category_id === cat.id)
                  return catServices.length ? (
                    <div key={cat.id} className="service-category">
                      <h3>{cat.name}</h3>
                      <div className="service-list">
                        {catServices.map((svc, i) => (
                          <div key={svc.id || i} className="service-row">
                            <div className="service-info">
                              <span className="service-name">{svc.name}</span>
                              {svc.duration_minutes && <span className="service-duration">⏱ {svc.duration_minutes}min</span>}
                              {svc.description && <p className="service-desc">{svc.description}</p>}
                            </div>
                            {svc.price != null && <span className="service-price">${svc.price}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                })
              ) : serviceMenu.length > 0 ? (
                <div className="service-list">
                  {serviceMenu.map((svc, i) => (
                    <div key={svc.id || i} className="service-row">
                      <div className="service-info">
                        <span className="service-name">{svc.name}</span>
                        {svc.duration_minutes && <span className="service-duration">⏱ {svc.duration_minutes}min</span>}
                        {svc.description && <p className="service-desc">{svc.description}</p>}
                      </div>
                      {svc.price != null && <span className="service-price">${svc.price}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No services listed yet</p>
              )}
              {classSchedule.length > 0 && (
                <div className="class-schedule-section">
                  <h3>Class Schedule</h3>
                  {classSchedule.map((cls, i) => (
                    <div key={cls.id || i} className="class-row">
                      <div>
                        <span className="class-name">{cls.class_name}</span>
                        {cls.start_time && <span className="class-time"> · {cls.start_time}</span>}
                        {cls.duration_minutes && <span className="class-duration"> · {cls.duration_minutes}min</span>}
                        {cls.capacity && <span className="class-cap"> · {cls.capacity} spots</span>}
                      </div>
                      <span className="class-day">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][cls.day_of_week] || cls.day_of_week}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* PRODUCTS — Shopping */}
          {activeTab === 'products' && (
            <section className="content-section">
              <h2>🛍️ Products</h2>
              {productCategories.length > 0 ? (
                productCategories.map(cat => {
                  const catProducts = products.filter(p => p.category_id === cat.id)
                  return catProducts.length ? (
                    <div key={cat.id} className="product-category">
                      <h3>{cat.name}</h3>
                      <div className="product-grid">
                        {catProducts.map((prod, i) => (
                          <div key={prod.id || i} className="product-card">
                            <div className="product-head">
                              <span className="product-name">{prod.name}</span>
                              <span className="product-price">${prod.price}</span>
                            </div>
                            {prod.description && <p className="product-desc">{prod.description}</p>}
                            {!prod.in_stock && <span className="out-of-stock">Out of stock</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                })
              ) : products.length > 0 ? (
                <div className="product-grid">
                  {products.map((prod, i) => (
                    <div key={prod.id || i} className="product-card">
                      <div className="product-head">
                        <span className="product-name">{prod.name}</span>
                        <span className="product-price">${prod.price}</span>
                      </div>
                      {prod.description && <p className="product-desc">{prod.description}</p>}
                      {!prod.in_stock && <span className="out-of-stock">Out of stock</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No products listed yet</p>
              )}
            </section>
          )}

          {/* PARK INFO */}
          {activeTab === 'park-info' && (
            <section className="content-section">
              <h2>🌳 Park Information</h2>
              {accessInfo && (
                <div className="access-info">
                  {accessInfo.entry_point && <p>🚗 <strong>Entry:</strong> {accessInfo.entry_point}</p>}
                  {accessInfo.parking_note && <p>🅿️ <strong>Parking:</strong> {accessInfo.parking_note}</p>}
                  {accessInfo.fee != null && accessInfo.fee > 0 && <p>💵 <strong>Entry fee:</strong> ${accessInfo.fee}</p>}
                  {accessInfo.fee === 0 && <p>✅ <strong>Free entry</strong></p>}
                </div>
              )}
              {facilities.length > 0 && (
                <div className="facilities-section">
                  <h3>Facilities</h3>
                  <div className="amenities-grid">
                    {facilities.map((f, i) => (
                      <div key={f.id || i} className={`amenity-item ${f.available === false ? 'unavailable' : ''}`}>
                        {f.available === false ? '❌' : '✅'} {f.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {spotRules.length > 0 && (
                <div className="rules-section">
                  <h3>Rules</h3>
                  <ul className="rules-list">
                    {spotRules.map((r, i) => (
                      <li key={r.id || i}>{r.rule}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* MEETING POINT — Activity / Charter */}
          {activeTab === 'meeting' && (
            <section className="content-section">
              <h2>📌 Meeting Point</h2>
              {meetingPoints.map((mp, i) => (
                <div key={mp.id || i} className="meeting-point-card">
                  <h3>{mp.name}</h3>
                  {mp.address && <p>📍 {mp.address}</p>}
                  {mp.instructions && <p>{mp.instructions}</p>}
                  {mp.parking_note && <p>🅿️ {mp.parking_note}</p>}
                  {mp.lat && mp.lng && (
                    <a href={`https://maps.google.com/?q=${mp.lat},${mp.lng}`} target="_blank" rel="noopener noreferrer" className="btn btn-directions">
                      📍 Get Directions
                    </a>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* FISH SPECIES — Charter / Fishing */}
          {activeTab === 'fish' && (
            <section className="content-section">
              <h2>🐟 Fish Species</h2>
              <div className="fish-grid">
                {fishSpecies.map((f, i) => (
                  <div key={f.id || i} className="fish-card">
                    <span className="fish-name">{f.species}</span>
                    {f.season && <span className="fish-season">Season: {f.season}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

        </main>

        {/* Sidebar */}
        <aside className="content-sidebar">
          {/* Quick Actions */}
          <div className="sidebar-card">
            <h3 className="sidebar-title">Quick Actions</h3>
            {business.phone && (
              <a href={`tel:${business.phone}`} className="sidebar-btn">📞 Call Now</a>
            )}
            {business.directions_url && (
              <a href={business.directions_url} target="_blank" rel="noopener noreferrer" className="sidebar-btn">
                📍 Directions
              </a>
            )}
            {business.menu_url && (
              <a href={business.menu_url} target="_blank" rel="noopener noreferrer" className="sidebar-btn">
                📄 Menu
              </a>
            )}
            {business.reservation_url && (
              <a href={business.reservation_url} target="_blank" rel="noopener noreferrer" className="sidebar-btn">
                🍽️ Reserve
              </a>
            )}
            {business.order_url && (
              <a href={business.order_url} target="_blank" rel="noopener noreferrer" className="sidebar-btn">
                🛵 Order
              </a>
            )}
            {orderLinks.length > 0 && orderLinks.map((link, i) => (
              <a
                key={link.id || i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-btn"
              >
                🛵 {link.label || link.type || 'Order Online'}
              </a>
            ))}
            {business.website_url && (
              <a href={business.website_url} target="_blank" rel="noopener noreferrer" className="sidebar-btn">
                🌐 Website
              </a>
            )}
          </div>

          {/* Hours Sidebar */}
          {hours.length > 0 && (
            <div className="sidebar-card">
              <h3 className="sidebar-title">Hours</h3>
              <ul className="hours-list">
                {hours.map((hr, idx) => (
                  <li key={idx} className={hr.day_of_week === new Date().getDay() ? 'today' : ''}>
                    <span className="day">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][hr.day_of_week || 0]}
                    </span>
                    <span className="time">
                      {hr.is_closed
                        ? 'Closed'
                        : `${formatTime(hr.opens_at) || '—'} – ${formatTime(hr.closes_at) || '—'}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Happy Hour Sidebar */}
          {business.hh_days && (
            <div className="sidebar-card hh-card">
              <h3 className="sidebar-title">🍺 Happy Hour</h3>
              <p>{business.hh_days}</p>
            </div>
          )}
        </aside>
      </div>

      {/* Gallery Modal */}
      {galleryOpen && (
        <div className="modal-overlay" onClick={() => setGalleryOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setGalleryOpen(false)}>✕</button>
            <h2>📸 Photos</h2>
            <div className="gallery-grid">
              {photos.slice(galleryPage * GALLERY_PER_PAGE, (galleryPage + 1) * GALLERY_PER_PAGE).map((photo, idx) => (
                <img key={idx} src={photo.image_url || photo.url} alt="" className="gallery-img" />
              ))}
            </div>
            {galleryTotal > 1 && (
              <div className="modal-pagination">
                <button disabled={galleryPage === 0} onClick={() => setGalleryPage(p => p - 1)}>← Prev</button>
                <span>Page {galleryPage + 1} of {galleryTotal}</span>
                <button disabled={galleryPage >= galleryTotal - 1} onClick={() => setGalleryPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
