# Shelfy Studio

Self-authored under explicit creative delegation. User approved a complete visual redesign and an interactive phone demo, with existing app screenshots from `temp`. No publication requested.

## Evidence and creative authority

- Product: personal wardrobe, outfit suggestions, AI try-on (repository README).
- Audience: Vietnamese Android users who want to rediscover clothes they own.
- User: "Bạn được quyền tự chọn lại màu sắc cũng như bố cục hay tất cả mọi thứ."
- User: "demo app trực tiếp ở landing page luôn mà chưa cần tải app".
- User: remove the fabricated seven-million-user claim.
- Assets: actual app screenshots supplied in `temp`; existing clothing images; one Unsplash fashion photograph. Do not present photography as an AI try-on result.
- Destination: existing HTTPS download configuration, default APKPure. Preserve analytics consent, admin, privacy and deletion pages.

## Eight creative decisions

1. Vibe: confident, fashion-forward, tactile, fresh. A fashion studio and a neatly composed contact sheet are the references, not a copied website.
2. Journey: familiar wardrobe, new combinations, interactive phone, honest AI introduction, download.
3. Energy: confident opening, quiet explanation, interactive high point, calm product evidence, clear close.
4. Remembered moment: changing an occasion on the virtual phone rearranges the outfit, and the chosen look follows into the closing invitation.
5. Signature: the wardrobe-to-outfit demo is operable, including category filtering, adding/removing a sample garment, outfit changes and saving a look for this visit.
6. Aesthetic: fashion editorial with a cold neutral canvas and acidic green accents; generous asymmetry, compact useful controls.
7. Distinct scenes. No continuous video journey or mandatory scroll lock.
8. Existing screenshots are used intact as optimized WebP. They are separately selectable from the interactive demonstration. No generated AI results or external API calls.

## Feeling curve (before act planning)

1. Curiosity: oversized type sits beside an independently layered fashion composition.
2. Recognition and frustration: a clearly fictional persona, Linh, moves through a rushed morning of outfit changes and an evening temptation to buy clothes. A wardrobe photograph and three short narrative beats make the pain concrete before the familiar-garment section offers a new perspective. This is a story, not customer research or a testimonial.
3. Agency and delight: the visitor can operate a sample wardrobe inside a phone and keep their chosen look.
4. Trust: real screenshots show what the app currently looks like; AI limits are explicit.
5. Belonging: a brand-authored letter introduces the people making Shelfy through their purpose and respect for personal style. User explicitly authorized authoring this story. No invented founders, team credentials, statistics or dated milestones.
6. Resolve: the selected outfit returns beside a single Android download action.

Peak: "I could change the outfit on the phone before downloading, and my choice stayed with me." Act 3 has the greatest content and interaction room, without artificial pinned scroll.

Tell-someone sentence: "It's the site where you try a small wardrobe on a phone, and the outfit you choose follows you to the end."

Authored silence: none. No empty scroll spans or filler.

## Grammar and fingerprint gate

Grammar: **Personal fitting desk**, a new constrained grammar. An asymmetric editorial opening leads to one operable phone as the center of the page. Navigation jumps to real sections. Supporting scenes explain the product, and the close repeats the visitor's selected outfit. Bans: fake AI progress, false success, forced scroll locking, video-only narrative, decorative dashboards, fabricated social proof, repeating feature-card rows.

The eight stock grammars do not fully fit: filmic one-shot prevents useful section navigation; chaptered editorial bans the media-led opening; live surface bans necessary product marketing; continuous world imposes a journey through a place; typographic poster omits garment imagery; gallery makes the range the product; split stage makes comparison the spine; rhythmic cutlist is too hurried for an operable demo.

Registry was empty before this build. First build passes with no prior rows to compare.

## Score

| Beat | Device | Purpose |
|---|---|---|
| Curiosity | Natural-flow layered parallax, restrained pointer depth | Separate fashion photo, typography, garment card and label |
| Recognition | Short flow reveal | Read the wardrobe promise without scroll tax |
| Agency | Operable HTML phone and outfit composition | Useful interaction is the peak, no simulation of a server |
| Trust | Clip reveal and real screenshot selection | Demonstrate actual UI and separate illustration from output |
| Resolve | Static close with synchronized selected garments | Preserve the visitor's choice and end decisively |

## Layer contract

| Layer | Asset | Motion / constraints |
|---|---|---|
| Far | cool neutral canvas and oversized outlined word | static framing |
| Mid | full fashion photograph in a tall architectural frame | small scroll displacement; never claims to be AI output |
| Near | separate garment still life | stronger restrained scroll displacement; does not hide copy |
| Label | lime outfit annotation | stable readable type, independent subtle pointer travel |
| Copy | semantic H1, paragraph, links | always complete, no opacity window |

Opening: title and full model composition visible. Midpoint: photographic plane recedes while garment card approaches. Exit: composition leaves naturally and compact wardrobe strip enters. Mobile: copy above a recomposed shorter scene, no pointer dependency. Reduced motion: complete static composition.

## QA inventory

- Desktop, 390px mobile, compact 360x640, reduced motion: hero opening/midpoint/exit and section frames.
- Phone: home/wardrobe/outfits; category filters; sample garment add/remove; occasion changes; item swaps; save state; reset; app screenshot mode and screenshot selector.
- State persists between demo and download close during this visit, not across reloads. Demo explicitly uses samples and no live AI.
- Navigation anchors, mobile menu including Escape and outside navigation, FAQ keyboard operation, download destination and tracking consent.
- Image loading, no horizontal overflow, console/runtime failures, accessibility focus order and contrast.
- Regression: privacy, account-deletion, unauthenticated admin, existing unit tests, lint and production build.
- Exploratory: rapidly switch demo modes; reduced motion and no animation script; refresh resets sample state; invalid download URL cannot navigate.

## Asset sources

- Actual app: `temp/home-outfit-refreshed.png`, `wardrobe-added.png`, `suggest-result2.png`, `trial-screen.png`. These are supplied app screenshots, not invented screens.
- Garments: existing `FE/Shelfyy/image/wardrobe-*` and pairing assets (pairing filenames are reversed; checked visually).
- Fashion photograph: Peter Chirkov, https://unsplash.com/photos/a-person-in-a-white-suit-4dC8ob5qrNE . Unsplash License: https://unsplash.com/license . Downloaded and stored locally; not used as an endorsement or AI output.
- Persona wardrobe photograph: Kamil Kalkan, https://unsplash.com/photos/clothes-hang-on-a-rack-against-a-white-wall-klMSx8K9SVc . Free under Unsplash License. Used as a wardrobe illustration, not as a picture of a customer. Persona Linh and her narrative are authored fiction, not interview evidence.

## Environment

Node and Chrome available. Original doctor reports no full FFmpeg, no project-local playwright-core, no Kie key. This build uses no video or paid image generation, so FFmpeg and Kie are unused. Browser verification uses the existing bundled Playwright runtime without a project dependency.
