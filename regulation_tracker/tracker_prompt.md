You are designing a dashboard for the prediction markets regulation tracker — a structured, source-cited dataset covering 
  39 jurisdictions (16 US, 23 international), 36 regulatory events, 10 battleground themes, 19 stakeholders, and 12 platform
   profiles.                                                                                 
                                                                                                                            
  The audiences and their questions                                                                                         
                                                                                                   
  This dashboard serves five distinct audiences who come to it with different questions and different urgency:              
                                                                                             
  Builders (platform operators, product teams, compliance officers) need to answer: Where can I operate? Where am I about to
   get blocked? What compliance obligations exist in each jurisdiction, and how fast are they changing? They need to see the
   map of accessibility, active litigation against platforms, and the velocity of regulatory change — not just the current  
  state, but the direction and momentum.                                                     
                                                                                                   
  Investors (VCs, institutional capital, public market analysts) need to answer: What is the regulatory risk surface for    
  this asset class? Which platforms have defensible regulatory positions? Where are the windows of opportunity closing or 
  opening? They care about the relationship between regulatory trajectory and market structure — who's winning the          
  jurisdictional fight, and what the resolution scenarios mean for enterprise value.         
                                                                                                   
  Policy experts (think tanks, government advisors, international regulators) need to answer: What regulatory frameworks are
   emerging? How are different jurisdictions classifying the same activity? Where are the fault lines between federal and 
  state authority, and what precedents are being set? They need the battleground analysis and the ability to trace how a    
  single regulatory question (e.g., "is this gambling or a derivative?") is being answered differently across jurisdictions
  and courts.                                                                                      
                      
  Lawyers (litigation counsel, regulatory attorneys, in-house legal teams) need to answer: What is the current case law?    
  Which courts have ruled on preemption, and how? What bills are pending that would change the legal landscape? They need
  precise citations, docket numbers, case trajectories, and the ability to see how rulings in one jurisdiction create       
  contagion risk or precedent in others.                                                     
                                                                                                   
  Researchers (academics, journalists, analysts) need to answer: What is the full picture? How did we get here? What are the
   competing narratives and who is driving them? They need the timeline, the stakeholder network, and the ability to
  understand the story arc of prediction market regulation as it unfolds.                                                   
                                                                                             
  The structural challenge: US depth vs. global breadth                                                                     
                      
  The dataset is fundamentally asymmetric and the dashboard must handle this honestly:                                      
                                                                                             
  The US story is deep and interconnected. 16 jurisdictions (federal + 14 states + a catch-all), all 36 tracked events, most
   stakeholders, and most litigation. But the US entries aren't independent — they're all nodes in a single federal-state
  conflict. A ruling in Maryland triggers amicus briefs from 38 states. A CFTC action reshapes the legal posture of every   
  state case. The sports betting overlap connects Kalshi's operations in Kentucky to the AGA's lobbying in Washington to a
  tax bill in the state legislature. The US needs a treatment that reveals these connections — not 16 separate jurisdiction
  pages, but a system where you can see the federal-state chessboard.
                                   
  The international story is broad and mostly independent. 23 jurisdictions making their own classification decisions — is  
  it gambling (France, Singapore, Australia), a financial instrument (Germany, possibly), banned outright (China, India), or
   unaddressed (UAE, Nigeria)? The connective tissue here is thinner: MiCA affects EU countries collectively, and           
  enforcement approaches vary (ISP blocks vs. DPI vs. user prosecution vs. doing nothing). International jurisdictions can
  be compared more cleanly in a matrix because they aren't locked in litigation with each other.   
                      
  The interaction between the two is also important. US platforms are expanding globally (Polymarket is blocked in 30+      
  countries). International regulatory approaches inform US debates (the UK's FCA classification, the EU's gambling
  consensus). And the crypto infrastructure question (Polymarket on Polygon) doesn't respect any border.                    
                                                                                             
  The dashboard should not force these into a single flattened view. The global map is a shared entry point, but drilling   
  into the US should feel like entering a deeper, more interconnected experience than drilling into France or Singapore.
                                                                                                                            
  Information architecture: organized by questions, not source files                                                        
                                                                                                   
  The five source files (jurisdictions, events, battlegrounds, stakeholders, platforms) are organized by data type. The     
  dashboard should be organized by the questions people actually ask. This means creating derived, cross-cutting views that
  pull from multiple source files. Some possibilities for how content might be organized:                                   
                                                                                             
  A global regulatory map that serves as the entry point. World view colored by status (Accessible / Restricted / Banned /  
  Uncertain / Unregulated). The US appears as one country at world scale but expands to show the state-level patchwork when
  you enter it. Every jurisdiction links to its detail view. Direction and momentum should be visible at the map level — not
   just "where things are" but "where things are going."                                     
                                                                                                   
  A US regulatory landscape that treats the federal-state conflict as a system, not a list. This is the deepest, most unique
   part of the dataset. It should reveal: the circuit split (which courts ruled which way on preemption), the legislative
  pipeline (6+ bills in Congress, state-level bills in KY/HI/TN/IA), platform-by-platform access (where                     
  Kalshi/Polymarket/CME can and can't operate), and the stakeholder alignment (who's suing whom, who filed amicus for whom).
   The contagion field on events exists precisely for this — showing how one action ripples through the system.
                      
  A litigation and legislation tracker that pulls case data from jurisdiction blocks, ruling events from the timeline, and  
  judicial/legislative stakeholders into one view. Organized by: active cases (by circuit), pending bills (by
  chamber/status), and recent rulings (chronological). This is almost entirely US content, and that's fine — label it       
  accordingly. Lawyers need docket numbers, case names, ruling dates, and appeal status in one place. The ability to see
  that the same preemption question has been answered differently in NJ (yes), MD (no), NV (reversed), MA (no), and OH (no)
  is the killer feature for this audience.
                                   
  A platform comparison that answers "who can operate where and under what terms." Cross-references platform profiles with  
  jurisdiction-level platform fields to create a matrix: platforms × jurisdictions × status. Also shows volume, regulatory
  posture, and integrity measures side by side. Builders and investors need this to understand competitive positioning and  
  regulatory moat.                                                                           
                                                                                                   
  A timeline / regulatory pulse that shows what's happening now and what's coming. Events from the timeline, but enriched   
  with urgency: upcoming deadlines (ANPRM comments due April 30, MiCA grandfathering ends July 1, bill hearings), recent
  actions, and pending outcomes. Filterable by jurisdiction, event type, impact level, and battleground. This is the "check 
  every morning" view.                                                                       
                                                                                                   
  A battleground / analysis layer that presents the 10 regulatory themes as lenses you can apply across the dataset. Each   
  battleground connects jurisdictions, stakeholders, cases, and events. "Federal preemption" links to 5+ court cases, 3+
  bills, CFTC statements, 38-state amicus briefs, and 10+ jurisdiction entries. This is where the analytical depth lives —  
  not a tab you browse sequentially, but a framing you can invoke from anywhere (e.g., viewing a jurisdiction and seeing
  which battlegrounds it touches).                                                                 
                      
  A stakeholder map that shows the actors, their positions, their influence, and their connections to each other. The       
  dataset tracks stance (pro_pm / anti_pm / mixed / neutral), key quotes, and battleground connections. The network
  structure matters: the Coalition for Prediction Markets connects Kalshi, Coinbase, Robinhood. The 38-state amicus connects
   state AGs across jurisdictions. Mulvaney's lobby opposes the Coalition. This is less a table and more a relationship
  graph.                                                                                           
                      
  A risk and opportunity matrix derived from the risk_level, opportunity, direction, and momentum fields across all         
  jurisdictions. A builder choosing where to expand, or an investor evaluating market-entry risk, needs this as a sortable,
  filterable view — not buried inside individual jurisdiction blocks.                                                       
                                                                                             
  Derived data worth computing                                                                                              
                      
  Several high-value views don't exist directly in the source files but can be computed from them:                          
                                                                                             
  - Platform × jurisdiction accessibility matrix — cross-referencing platform profiles with jurisdiction platform fields    
  (kalshi, polymarket, robinhood, etc.)                                                      
  - Sports vs. non-sports regulatory split — the data shows these are diverging into separate regulatory tracks; surfacing  
  this split explicitly would clarify a confusing landscape                                                                 
  - Contagion graph — which events triggered reactions in other jurisdictions (the contagion field on events encodes this)
  - Deadline calendar — extracted from pending bill dates, comment periods (ANPRM April 30), regulatory deadlines (MiCA July
   1), and case schedules                                                                                                   
  - Classification comparison — how each jurisdiction classifies the same activity (gambling / derivative / security /      
  unaddressed), pulled from the classification field across all jurisdictions                                               
  - Circuit scorecard — preemption rulings by US circuit court, showing the split that may force Supreme Court review
                                                                                                                            
  Design intentions                                                                                                         
                                                                                                                            
  Make the complexity navigable without hiding it. This dataset is dense and interconnected — jurisdictions link to events  
  link to battlegrounds link to stakeholders link to platforms. The dashboard should let someone enter through any door (a
  jurisdiction, a date, a platform, a legal question) and discover the connections. Don't flatten the data into a simple    
  summary; make the depth accessible on demand.                                              
                                                                                                   
  Prioritize decision-relevance over comprehensiveness. Every view should answer a question someone would actually ask      
  before making a decision. If a piece of data doesn't help someone decide where to launch, whether to invest, how to advise
   a client, or what to write — it shouldn't be in the default view.                                                        
                                                                                             
  Show direction, not just state. The most valuable thing in this dataset is not "what the rules are today" but "which way  
  the rules are moving and how fast." Direction and momentum fields exist for every jurisdiction. The dashboard should make
  regulatory trajectory legible at a glance — which places are liberalizing, which are tightening, and where the pace of    
  change is accelerating.                                                                    
                                                                                                   
  Respect the source chain. Every data point traces to a primary source with a URL. The dashboard should make citations     
  discoverable without cluttering the interface. When someone sees "Restricted" on a jurisdiction, they should be one
  interaction away from the court ruling or statute that makes it so.                                                       
                                                                                             
  Reveal the network, not just the list. Battlegrounds connect jurisdictions to each other. A ruling in Maryland creates    
  contagion in 38 states via amicus briefs. A bill in Congress references a scandal on Polymarket. The dashboard should
  surface these connections — the same regulatory tension playing out across multiple jurisdictions, the same stakeholders  
  appearing in multiple contexts.                                                            
                                                                                                   
  Support both the 30-second scan and the 30-minute deep dive. A builder checking "can I operate in Kentucky" needs an      
  instant answer. A lawyer preparing for oral argument needs every case, every bill, every stakeholder quote. The same data
  should serve both without requiring separate products.                                                                    
                                                                                             
  The data                                                                                                                  
                      
  The structured source files are in data/. They use markdown tables and structured blocks with inline source citations.    
  Every data point links to a primary source URL.                                            
                                                                                                                            
  - 01-jurisdictions.md — 39 jurisdiction blocks (16 US: federal + 14 states + catch-all; 7 EU: union-level + 6 countries; 7
   Asia-Pacific; 8 emerging markets). Each block has ~20 fields including status, classification, regulatory body, key
  legislation, pending bills, active litigation, platform-by-platform availability, direction, momentum, risk/opportunity   
  ratings, and a prose summary.                                                              
  - 02-events.md — 36 chronological events (all US-centric, 2020–2026). Each row has date, jurisdiction, type (court_ruling
  / legislation_introduced / enforcement / regulatory_action / platform_filing / industry_event), impact level, battleground
   tags, contagion notes, status, and source citation.
  - 03-battlegrounds.md — 10 regulatory theme blocks. Each has core_tension, side_a, side_b, key_cases, current_status,     
  trajectory, industry_impact, and resolution_scenarios. Themes: federal preemption, gambling-vs-derivatives, sports betting
   overlap, insider trading, market listing standards, self-regulation, crypto infrastructure, cross-border enforcement,
  consumer protection, traditional exchange entry.                                                                          
  - 04-stakeholders.md — 19 actors. Each row has actor, type (federal_regulator / state_regulator / legislator / platform /
  exchange / lobby_pro / lobby_anti / judiciary / academic), jurisdiction, stance (pro_pm / anti_pm / mixed / neutral), key 
  actions, key quote with date/source, motivation, influence level, and battleground connections.
  - 05-platforms.md — 12 platform profiles (Kalshi, Polymarket, CME/FanDuel, Cboe, Robinhood, Nasdaq, Smarkets, Betfair,    
  Metaculus, DraftKings, Coinbase, Gemini). Each has type, volume, licenses, jurisdictions active/blocked/contested, market 
  types, integrity measures, regulatory posture, and key people.             