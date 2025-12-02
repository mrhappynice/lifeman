# Life Manager
Categorize and manage your life, with calendar and instant lexical search of titles, tags, and the description content of each card.  

Select a category, enter info, track info/tasks/projects, timely calendar included.

Built web only version for Netlify deploy and hosting with Nginx etc. try it out: https://lifeman.mhn.lol  
Supports backing up and loading data to/from device. *Note clearing cookie or site data will clear the database as it is stored in browser localstorage. So, BACKUP! Your database will persist as long as you don't delete browser cookies/site data. Source is in web folder. Template for JS instant lexical search including title, description, and tags of cards. Included calendar system tied to search, along with the topical tagging system. 

## Quick Start🏁
glibc 2.35+ (Ubuntu 22+) binary ready
- ```sh 
  curl -fsSL https://raw.githubusercontent.com/mrhappynice/lifeman/main/install.sh | bash
  ```
  enter ```lifeman``` folder and run: ```./lifeman``` - sample cards included, delete data.json and restart app for clean db
- windows install just:
  ```sh
  git clone https://github.com/mrhappynice/lifeman.git
  ```
  and download exe, put in lifeman folder. run ```.\lifeman.exe``` in terminal (or double click exe *shrugs* lol) connect http://localhost:3030

Build:
```sh
cargo build --release
```
