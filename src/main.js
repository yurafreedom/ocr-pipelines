import './css/main.css';
import { init as initCalculator } from './js/calculator.js';
import { init as initReviewCard } from './js/review-card.js';
import { init as initAuditForm } from './js/audit-form.js';
import { init as initCalendly } from './js/calendly.js';
import { init as initDemo } from './js/demo.js';
import { init as initSegments } from './js/segments.js';
import { init as initLegacyAnchors } from './js/legacy-anchors.js';

initAuditForm(); // before the calculator, so it hears estimates the calculator sends
initCalendly();
initCalculator();
initReviewCard();
initDemo();
initSegments();
initLegacyAnchors(); // last, so the layout it scrolls to is final
