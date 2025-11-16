# NYC Taxi Fare Guess – Design Document

This document explains the design phase of the NYC Taxi Fare Guess geo-game.  
The goal of this phase is to define the game requirements, user interface layout, game flow, and the logic behind the system before implementation.

---

## Game Objective
The purpose of the game is to show the user simplified NYC taxi trip information and let the player guess the approximate taxi fare.  
The player tries to achieve the highest score possible within a time limit while using a map-based interface.

---

## Game Requirements
The game consists of the following components:

- A global timer with three selectable modes (60s, 30s, 15s)
- Score counter
- A life system (3 lives)
- Multiple-choice fare question with four possible answers
- Trip information (pickup hour, distance, pickup borough, dropoff borough)
- A map showing pickup (P) and dropoff (D) markers
- Switchable map layers (OSM / Light / Dark)
- A main menu with:
  - Player name input
  - Time mode selection
  - Start Game and How to Play buttons
  - Top 3 score display
- A Game Over screen that shows final results and allows replaying or returning to the menu

---

## Game Progression
1. The player enters their name on the main menu.
2. The player selects one of the time modes (60s, 30s, 15s).
3. The game starts. The timer decreases, score begins at zero, and the player has 3 lives.
4. Each question shows:
   - Pickup hour  
   - Trip distance  
   - Pickup borough  
   - Dropoff borough  
   - A map with pickup and dropoff markers  
   - Four fare options
5. If the player selects the correct fare:
   - Score increases by +100.
6. If the player selects the wrong fare:
   - The player loses one life.
7. If the timer reaches zero:
   - The player also loses one life.
8. The game ends when the player has zero lives.
9. The Game Over screen appears and shows:
   - Final score
   - Number of correct answers
   - Total questions answered
   - Top 3 high scores
   The player can restart or return to the main menu.

---

## Number of Questions
There is no fixed number of questions.  
Questions continue until both time and lives run out.

---

## Life System
The player starts with 3 lives.  
Lives decrease when:
- The player selects a wrong answer  
- The countdown timer reaches zero  

When all lives are lost, the game ends.

---

## JavaScript Library to Be Used
The game will use **Leaflet.js** for the geospatial component.  
Planned features include:
- Displaying pickup/dropoff markers
- Switching between basemap styles (OSM, Light, Dark)
- Auto-fitting the map to show both markers

---

## Use of NYC Taxi Data

- NYC borough structure
- Typical trip distances
- Hour-based fare variations
- General fare range patterns

These elements guide the creation of realistic question data.

---

## Hand-Drawn UI Layouts
As required, the User Interface screens were sketched by hand.  
They are included in the `design/` folder.

### 1. Main Menu Layout
[Main Menu Layout](design/menu-layout.jpg.jpeg)

### 2. Game Screen Layout
[Game Screen Layout](design/game-screen.jpg.jpeg)


### 3. Game Over Layout
[Game Over Layout](design/game-over.jpg.jpeg)


---

## Project Structure (Design Phase)
```
/ (root)
|– README.md
|– design/
     |– menu-layout.jpg
     |– game-screen.jpg
     |– game-over.jpg
```

This document summarizes the full design phase before implementation begins.
