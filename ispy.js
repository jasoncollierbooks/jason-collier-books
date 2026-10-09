/* I-Spy: pick any book illustration, five random targets a round, fading marks, scene ambience */
const ISPY_BOOKS = [
 {
  "id": "jang",
  "name": "Jang & Tom",
  "sound": "prairie",
  "pics": [
   {
    "id": "wagon-masters-cover",
    "src": "images/jang-and-tom-wagon-masters.jpg",
    "title": "Wagon Masters",
    "credit": "Cover · Jang & Tom · Wagon Masters",
    "items": [
     {
      "n": "Grizzly bear",
      "b": [
       68.3,
       31.3,
       17,
       14.2
      ]
     },
     {
      "n": "Running cowboy",
      "b": [
       86.2,
       33.2,
       11.8,
       12.7
      ]
     },
     {
      "n": "Cows in a whirlpool",
      "b": [
       9.3,
       30.8,
       17,
       8.3
      ]
     },
     {
      "n": "Chicken in a crate",
      "b": [
       20.2,
       34.2,
       14.8,
       8.6
      ]
     },
     {
      "n": "Covered wagon",
      "b": [
       12.4,
       47.4,
       22.5,
       22.4
      ]
     },
     {
      "n": "Laughing man in plaid",
      "b": [
       28.7,
       39.5,
       22,
       32
      ]
     },
     {
      "n": "Man with arms crossed",
      "b": [
       51.2,
       43,
       18,
       30
      ]
     },
     {
      "n": "Goat with a garland",
      "b": [
       11.6,
       67.9,
       18.6,
       17.1
      ]
     },
     {
      "n": "Three alpacas",
      "b": [
       33.4,
       75.2,
       28,
       14.1
      ]
     },
     {
      "n": "Stagecoach and horses",
      "b": [
       68.3,
       68.4,
       27.4,
       14.8
      ]
     },
     {
      "n": "Jang & Tom title",
      "b": [
       16.3,
       4.4,
       50,
       8
      ]
     },
     {
      "n": "Jason Collier name",
      "b": [
       22.5,
       88.9,
       50,
       6.4
      ]
     }
    ]
   },
   {
    "id": "wagonmasters-poster",
    "src": "media/wagonmasters_part1of6_poster.jpg",
    "title": "Beside the Wagon",
    "credit": "Audiobook art · Jang & Tom · Wagon Masters",
    "items": [
     {
      "n": "Laughing bearded face",
      "b": [
       13,
       0,
       10,
       17
      ]
     },
     {
      "n": "Smiling man's face",
      "b": [
       57,
       4,
       9,
       18
      ]
     },
     {
      "n": "Raised hand",
      "b": [
       38.5,
       15,
       8.5,
       20
      ]
     },
     {
      "n": "Cowboy hat",
      "b": [
       60,
       0,
       13,
       16
      ]
     },
     {
      "n": "Red bandana",
      "b": [
       59.5,
       19,
       6.5,
       12
      ]
     },
     {
      "n": "Belt buckle",
      "b": [
       20.5,
       53,
       4.5,
       6.5
      ]
     },
     {
      "n": "Wagon wheel",
      "b": [
       33,
       52,
       14,
       36
      ]
     },
     {
      "n": "Patch on the wagon cover",
      "b": [
       33,
       1.5,
       6.5,
       13.5
      ]
     },
     {
      "n": "Hay bale",
      "b": [
       83,
       55,
       17,
       16
      ]
     },
     {
      "n": "Wooden fence",
      "b": [
       81,
       26,
       19,
       28
      ]
     },
     {
      "n": "Barn",
      "b": [
       73,
       0,
       24,
       36
      ]
     },
     {
      "n": "Holstered pistol",
      "b": [
       10.5,
       61,
       5.5,
       22
      ]
     }
    ]
   },
   {
    "id": "scene-transcon-s01",
    "src": "images/scenes/transcon-s01.jpg",
    "title": "Stagecoach at Sunset",
    "credit": "Grok image art · Jang & Tom · Transcontinental",
    "items": [
     {
      "n": "Red stagecoach",
      "b": [
       11.5,
       42,
       30,
       40
      ]
     },
     {
      "n": "Big spoked wheel",
      "b": [
       23.8,
       63,
       9.2,
       24.5
      ]
     },
     {
      "n": "Rear wheel",
      "b": [
       11.5,
       61,
       9,
       26
      ]
     },
     {
      "n": "Front wheel",
      "b": [
       37.5,
       68,
       5,
       16.5
      ]
     },
     {
      "n": "Stagecoach driver",
      "b": [
       33.5,
       37.5,
       6,
       14
      ]
     },
     {
      "n": "Luggage on the roof",
      "b": [
       21,
       42,
       11.5,
       8.5
      ]
     },
     {
      "n": "Team of horses",
      "b": [
       39.5,
       56.5,
       22,
       26
      ]
     },
     {
      "n": "Lead horse",
      "b": [
       54,
       58,
       10.5,
       21
      ]
     },
     {
      "n": "Snow-capped peak",
      "b": [
       77,
       35,
       12,
       15
      ]
     },
     {
      "n": "Upstairs windows",
      "b": [
       5,
       30.5,
       10,
       10
      ]
     },
     {
      "n": "Telegraph pole",
      "b": [
       91.5,
       49,
       2.5,
       21
      ]
     },
     {
      "n": "Townsfolk on the boardwalk",
      "b": [
       1.5,
       61.5,
       11,
       12
      ]
     }
    ]
   },
   {
    "id": "scene-philly-s09",
    "src": "images/scenes/philly-s09.jpg",
    "title": "The Farmyard",
    "credit": "Grok image art · Jang & Tom · Philadelphia Follies",
    "items": [
     {
      "n": "Straw hat with cherries",
      "b": [
       19.5,
       1,
       16.5,
       17.5
      ]
     },
     {
      "n": "Cherries",
      "b": [
       21,
       7,
       4.5,
       7
      ]
     },
     {
      "n": "Brown cowboy hat",
      "b": [
       58.5,
       5.5,
       11,
       12
      ]
     },
     {
      "n": "Broom",
      "b": [
       47.5,
       20,
       10,
       40
      ]
     },
     {
      "n": "Man lying in the manure",
      "b": [
       32,
       64,
       36,
       28
      ]
     },
     {
      "n": "Fallen man's hat",
      "b": [
       29.8,
       62.5,
       13.3,
       12
      ]
     },
     {
      "n": "Red bandana",
      "b": [
       40,
       74,
       4.5,
       12
      ]
     },
     {
      "n": "Screaming woman",
      "b": [
       77,
       8,
       16,
       40
      ]
     },
     {
      "n": "Potted plant",
      "b": [
       92.5,
       45,
       6.5,
       16
      ]
     },
     {
      "n": "Porch steps",
      "b": [
       72,
       64,
       18,
       12
      ]
     },
     {
      "n": "Bearded man's face",
      "b": [
       54,
       16,
       12,
       16
      ]
     },
     {
      "n": "Horse's raised hoof",
      "b": [
       8,
       28,
       14,
       22
      ]
     }
    ]
   },
   {
    "id": "scene-transcon-s10",
    "src": "images/scenes/transcon-s10.jpg",
    "title": "The Crash",
    "credit": "Grok image art · Jang & Tom · Transcontinental",
    "items": [
     {
      "n": "Black top hat",
      "b": [
       62.3,
       32.5,
       6.8,
       9.5
      ]
     },
     {
      "n": "Falling man",
      "b": [
       38.5,
       32,
       39,
       45
      ]
     },
     {
      "n": "Yellow waistcoat",
      "b": [
       53.5,
       45.5,
       9.5,
       21
      ]
     },
     {
      "n": "Broken front wheel",
      "b": [
       6.5,
       62,
       13.5,
       27
      ]
     },
     {
      "n": "Rear wheel",
      "b": [
       4.5,
       36,
       8.5,
       22
      ]
     },
     {
      "n": "Luggage on the roof",
      "b": [
       23,
       4.5,
       18.5,
       9
      ]
     },
     {
      "n": "Bearded driver",
      "b": [
       75.5,
       1.5,
       24,
       40
      ]
     },
     {
      "n": "Brown cowboy hat",
      "b": [
       79,
       1.5,
       8.5,
       8
      ]
     },
     {
      "n": "Shouting man",
      "b": [
       61.5,
       6.5,
       17,
       22
      ]
     },
     {
      "n": "Shouting man's hat",
      "b": [
       68,
       7.5,
       7.5,
       7
      ]
     },
     {
      "n": "Second coach front wheel",
      "b": [
       69,
       40,
       5.5,
       17
      ]
     },
     {
      "n": "Second coach rear wheel",
      "b": [
       77,
       43,
       7,
       17
      ]
     }
    ]
   },
   {
    "id": "scene-philly-s21",
    "src": "images/scenes/philly-s21.jpg",
    "title": "The Horse Race",
    "credit": "Grok image art · Jang & Tom · Philadelphia Follies",
    "items": [
     {
      "n": "Red cap",
      "b": [
       39.5,
       4,
       6.5,
       7.5
      ]
     },
     {
      "n": "Red flag",
      "b": [
       3.5,
       17,
       12.5,
       22
      ]
     },
     {
      "n": "Flag post",
      "b": [
       2.5,
       12,
       3.5,
       50
      ]
     },
     {
      "n": "Black riding boot",
      "b": [
       15.8,
       57,
       7,
       11
      ]
     },
     {
      "n": "Stirrup",
      "b": [
       45.5,
       62,
       5.5,
       10
      ]
     },
     {
      "n": "Green-capped jockey",
      "b": [
       57,
       25,
       7,
       16
      ]
     },
     {
      "n": "Black horse",
      "b": [
       54,
       33,
       13.5,
       36
      ]
     },
     {
      "n": "Blue-capped jockey",
      "b": [
       68.8,
       27,
       7.8,
       20
      ]
     },
     {
      "n": "Yellow-capped jockey",
      "b": [
       79.5,
       31,
       6.5,
       15
      ]
     },
     {
      "n": "Purple-capped jockey",
      "b": [
       87.4,
       34,
       5.5,
       13
      ]
     },
     {
      "n": "Lead horse's head",
      "b": [
       28,
       18,
       16,
       18
      ]
     },
     {
      "n": "Bearded rider's face",
      "b": [
       36,
       10,
       10,
       14
      ]
     }
    ]
   },
   {
    "id": "scene-transcon-s21",
    "src": "images/scenes/transcon-s21.jpg",
    "title": "Through the Herd",
    "credit": "Grok image art · Jang & Tom · Transcontinental",
    "items": [
     {
      "n": "Brown hat waved in the air",
      "b": [
       32,
       1,
       6,
       11
      ]
     },
     {
      "n": "Man waving his hat",
      "b": [
       32,
       1,
       18,
       32
      ]
     },
     {
      "n": "Red neckerchief",
      "b": [
       42.5,
       9,
       4,
       7
      ]
     },
     {
      "n": "Bearded driver",
      "b": [
       46,
       7.5,
       16,
       36
      ]
     },
     {
      "n": "Driver's cowboy hat",
      "b": [
       54,
       7.5,
       7.5,
       8.5
      ]
     },
     {
      "n": "Red coach body",
      "b": [
       59,
       14,
       22,
       40
      ]
     },
     {
      "n": "Luggage on the roof",
      "b": [
       61,
       13.5,
       18,
       12
      ]
     },
     {
      "n": "Front wagon wheel",
      "b": [
       58,
       62,
       8,
       20
      ]
     },
     {
      "n": "Rear wagon wheel",
      "b": [
       73.5,
       59,
       10.5,
       28
      ]
     },
     {
      "n": "Lead horse's head",
      "b": [
       9,
       26,
       12,
       28
      ]
     },
     {
      "n": "White spotted longhorn",
      "b": [
       32,
       58,
       26,
       36
      ]
     },
     {
      "n": "Brown longhorn",
      "b": [
       84,
       53,
       15,
       33
      ]
     }
    ]
   },
   {
    "id": "scene-philly-s45",
    "src": "images/scenes/philly-s45.jpg",
    "title": "Tin Cups",
    "credit": "Grok image art · Jang & Tom · Philadelphia Follies",
    "items": [
     {
      "n": "Campfire",
      "b": [
       28.5,
       79,
       10.5,
       16.5
      ]
     },
     {
      "n": "Tin cups",
      "b": [
       45.5,
       48.5,
       6,
       8.5
      ]
     },
     {
      "n": "Left man's cowboy hat",
      "b": [
       29.5,
       36,
       13,
       10
      ]
     },
     {
      "n": "Right man's cowboy hat",
      "b": [
       57,
       34,
       14,
       10
      ]
     },
     {
      "n": "Mustached man",
      "b": [
       22,
       36,
       22,
       42
      ]
     },
     {
      "n": "Red neckerchief",
      "b": [
       33.5,
       50,
       4.5,
       9
      ]
     },
     {
      "n": "Bearded man in plaid",
      "b": [
       50.5,
       34,
       24,
       48
      ]
     },
     {
      "n": "Long dark beard",
      "b": [
       61,
       44,
       7,
       14
      ]
     },
     {
      "n": "Covered wagons on the left",
      "b": [
       0,
       44,
       26,
       18
      ]
     },
     {
      "n": "Covered wagons on the right",
      "b": [
       75,
       44,
       24,
       18
      ]
     }
    ]
   },
   {
    "id": "transcon-s46",
    "src": "images/scenes/transcon-s46.jpg",
    "title": "The Goat and the Top Hat",
    "credit": "Grok image art · Jang & Tom · Transcontinental",
    "items": [
     {
      "n": "White goat",
      "b": [
       2,
       59,
       34,
       38
      ]
     },
     {
      "n": "Hat in the goat's mouth",
      "b": [
       35,
       69,
       11,
       12
      ]
     },
     {
      "n": "Shocked man's face",
      "b": [
       45,
       52,
       8.5,
       16
      ]
     },
     {
      "n": "Black top hat",
      "b": [
       7.5,
       14.5,
       12,
       17
      ]
     },
     {
      "n": "Walrus mustache",
      "b": [
       10.5,
       31,
       8.5,
       7
      ]
     },
     {
      "n": "Watch chain",
      "b": [
       16,
       67,
       9,
       6
      ]
     },
     {
      "n": "Raised brown hat",
      "b": [
       44.5,
       4,
       9.5,
       14
      ]
     },
     {
      "n": "Red neckerchief",
      "b": [
       55,
       37,
       9,
       17
      ]
     },
     {
      "n": "Bearded man's black hat",
      "b": [
       83,
       18.5,
       13.5,
       12
      ]
     },
     {
      "n": "Wrecked timber",
      "b": [
       65,
       9,
       22,
       24
      ]
     },
     {
      "n": "Reporter's notepad",
      "b": [
       70.5,
       48.5,
       4.5,
       6
      ]
     },
     {
      "n": "Laughing woman",
      "b": [
       0,
       29,
       6.5,
       17
      ]
     }
    ]
   },
   {
    "id": "scene-transcon-s57",
    "src": "images/scenes/transcon-s57.jpg",
    "title": "The Dock",
    "credit": "Grok image art · Jang & Tom · Transcontinental",
    "items": [
     {
      "n": "White handkerchief",
      "b": [
       17.5,
       16.5,
       11.5,
       14
      ]
     },
     {
      "n": "Red-haired woman",
      "b": [
       9,
       26,
       8,
       18
      ]
     },
     {
      "n": "Left boy's raised cap",
      "b": [
       21.5,
       32.5,
       5,
       8
      ]
     },
     {
      "n": "Right boy's raised cap",
      "b": [
       30.5,
       36,
       5.5,
       8
      ]
     },
     {
      "n": "White goat",
      "b": [
       14.5,
       65,
       24,
       30
      ]
     },
     {
      "n": "Paper in the goat's mouth",
      "b": [
       37.5,
       74.5,
       7.5,
       14
      ]
     },
     {
      "n": "Smokestack",
      "b": [
       69,
       7.5,
       5,
       25
      ]
     },
     {
      "n": "Red paddle wheel",
      "b": [
       80,
       42.5,
       12,
       20
      ]
     },
     {
      "n": "Raised brown hat",
      "b": [
       45.5,
       11,
       5.5,
       8.5
      ]
     },
     {
      "n": "Bearded man waving",
      "b": [
       60,
       24,
       14,
       28
      ]
     },
     {
      "n": "Red neckerchief",
      "b": [
       54.5,
       30.5,
       4.5,
       9
      ]
     },
     {
      "n": "Dock piling",
      "b": [
       56,
       74,
       4.5,
       22
      ]
     }
    ]
   },
   {
    "id": "art-philly-s01",
    "src": "images/art/philly-s01.jpg",
    "title": "The Street Lamp",
    "credit": "Grok image art · Jang & Tom · Philadelphia Follies",
    "items": [
     {
      "n": "Horse",
      "b": [
       10.5,
       54,
       10,
       32
      ]
     },
     {
      "n": "Enclosed carriage",
      "b": [
       20,
       50.5,
       15,
       29
      ]
     },
     {
      "n": "Rear carriage wheel",
      "b": [
       31,
       61.5,
       5,
       18
      ]
     },
     {
      "n": "Front carriage wheel",
      "b": [
       26.5,
       65.5,
       5,
       14
      ]
     },
     {
      "n": "Man in a top hat",
      "b": [
       73,
       38,
       12,
       48
      ]
     },
     {
      "n": "Top hat",
      "b": [
       76,
       34.5,
       5.5,
       8.5
      ]
     },
     {
      "n": "Lit street lamp",
      "b": [
       81.5,
       6,
       7,
       22
      ]
     },
     {
      "n": "Lamp post",
      "b": [
       83.5,
       28,
       4,
       48
      ]
     },
     {
      "n": "Distant street lamp",
      "b": [
       65.5,
       52,
       2.5,
       6.5
      ]
     },
     {
      "n": "Chimney",
      "b": [
       12.5,
       7,
       4.5,
       11
      ]
     }
    ]
   },
   {
    "id": "art-philly-s03",
    "src": "images/art/philly-s03.jpg",
    "title": "The Pickled Eggs",
    "credit": "Grok image art · Jang & Tom · Philadelphia Follies",
    "items": [
     {
      "n": "Jar of pickled eggs",
      "b": [
       7,
       49,
       24.5,
       51
      ]
     },
     {
      "n": "Pickled egg",
      "b": [
       12.5,
       68,
       9.5,
       13
      ]
     },
     {
      "n": "Pointing finger",
      "b": [
       28,
       71,
       9,
       14
      ]
     },
     {
      "n": "Round spectacles",
      "b": [
       38,
       23.5,
       20,
       13.5
      ]
     },
     {
      "n": "Sly grin",
      "b": [
       43,
       43,
       9,
       6.5
      ]
     },
     {
      "n": "White shirt collar",
      "b": [
       47,
       51,
       13,
       10
      ]
     },
     {
      "n": "Black cravat",
      "b": [
       48.5,
       57,
       9,
       22
      ]
     },
     {
      "n": "Hanging oil lamp",
      "b": [
       82,
       15,
       12,
       28
      ]
     },
     {
      "n": "Glass bottle",
      "b": [
       1,
       25,
       8.5,
       42
      ]
     }
    ]
   },
   {
    "id": "transcon-s07",
    "src": "images/art/transcon-s07.jpg",
    "title": "The Stage-Line Livery",
    "credit": "Grok image art · Jang & Tom · Transcontinental",
    "items": [
     {
      "n": "Stage-Line Livery sign",
      "b": [
       8.5,
       0,
       40.5,
       21
      ]
     },
     {
      "n": "To all points west poster",
      "b": [
       1.5,
       29,
       9.5,
       28
      ]
     },
     {
      "n": "Ladder",
      "b": [
       3,
       60,
       8,
       27
      ]
     },
     {
      "n": "Basket of apples",
      "b": [
       14,
       80,
       11.5,
       20
      ]
     },
     {
      "n": "Straw hat",
      "b": [
       26.5,
       38.5,
       9.5,
       8.5
      ]
     },
     {
      "n": "Old man with a white beard",
      "b": [
       22,
       38,
       18,
       59
      ]
     },
     {
      "n": "Mule",
      "b": [
       37,
       42,
       19.5,
       52
      ]
     },
     {
      "n": "Brown cowboy hat",
      "b": [
       17,
       29.5,
       7.5,
       9.5
      ]
     },
     {
      "n": "Concord coach",
      "b": [
       35,
       33,
       17,
       19
      ]
     },
     {
      "n": "Red coach",
      "b": [
       55,
       22,
       19.5,
       42
      ]
     },
     {
      "n": "Kneeling man's hat",
      "b": [
       75,
       46,
       9.5,
       10
      ]
     },
     {
      "n": "Wagon wheel",
      "b": [
       83.5,
       65,
       13,
       32
      ]
     }
    ]
   },
   {
    "id": "art-transcon-s15",
    "src": "images/art/transcon-s15.jpg",
    "title": "The Race Poster",
    "credit": "Grok image art · Jang & Tom · Transcontinental",
    "items": [
     {
      "n": "Race poster headline",
      "b": [
       19,
       5,
       40,
       12
      ]
     },
     {
      "n": "Pointing man's hat",
      "b": [
       13,
       22,
       16,
       18
      ]
     },
     {
      "n": "Red bandana",
      "b": [
       18,
       43,
       8,
       12
      ]
     },
     {
      "n": "Bearded man's hat",
      "b": [
       60,
       24,
       14,
       12
      ]
     },
     {
      "n": "Painted stagecoach",
      "b": [
       33,
       27,
       22,
       22
      ]
     },
     {
      "n": "Pile of gold coins",
      "b": [
       41,
       61,
       13,
       18
      ]
     },
     {
      "n": "Black hat",
      "b": [
       81,
       26,
       8,
       7
      ]
     },
     {
      "n": "Bottles on the shelves",
      "b": [
       89,
       12,
       10,
       28
      ]
     },
     {
      "n": "Brass goblet",
      "b": [
       92.5,
       51,
       7,
       10
      ]
     },
     {
      "n": "Pointing finger",
      "b": [
       28,
       48,
       8,
       10
      ]
     },
     {
      "n": "Crossed arms",
      "b": [
       54,
       40,
       14,
       16
      ]
     },
     {
      "n": "Bar counter",
      "b": [
       78,
       70,
       20,
       16
      ]
     }
    ]
   },
   {
    "id": "philly-s15",
    "src": "images/art/philly-s15.jpg",
    "title": "The Pink Dress",
    "credit": "Grok image art · Jang & Tom · Philadelphia Follies",
    "items": [
     {
      "n": "Bearded man in a pink dress",
      "b": [
       6,
       2,
       29,
       90
      ]
     },
     {
      "n": "Feathered hat",
      "b": [
       10.5,
       1,
       18.5,
       21
      ]
     },
     {
      "n": "Boy's straw hat",
      "b": [
       37,
       49.5,
       12,
       13.5
      ]
     },
     {
      "n": "Boy in a blue shirt",
      "b": [
       35,
       50,
       14,
       50
      ]
     },
     {
      "n": "Pointing girl",
      "b": [
       46,
       38.5,
       17,
       61.5
      ]
     },
     {
      "n": "Pointing boy",
      "b": [
       49.5,
       57,
       21,
       43
      ]
     },
     {
      "n": "Lace bonnet",
      "b": [
       69,
       22,
       8,
       12
      ]
     },
     {
      "n": "Dark bonnet",
      "b": [
       78.5,
       21,
       10,
       13
      ]
     },
     {
      "n": "Boy's black hat",
      "b": [
       74,
       54,
       10.5,
       12
      ]
     },
     {
      "n": "Boy in a black hat",
      "b": [
       71,
       54,
       13,
       46
      ]
     },
     {
      "n": "Straw bonnet",
      "b": [
       91,
       26,
       8.5,
       10
      ]
     }
    ]
   },
   {
    "id": "art-transcon-s26",
    "src": "images/art/transcon-s26.jpg",
    "title": "Geese on the Coach",
    "credit": "Grok image art · Jang & Tom · Transcontinental",
    "items": [
     {
      "n": "Standing man's hat",
      "b": [
       62,
       13,
       9,
       7
      ]
     },
     {
      "n": "Seated driver's hat",
      "b": [
       62.5,
       35,
       10,
       8
      ]
     },
     {
      "n": "Bearded driver",
      "b": [
       59,
       35,
       16,
       36
      ]
     },
     {
      "n": "Crates of geese",
      "b": [
       73,
       27,
       22,
       20
      ]
     },
     {
      "n": "Brown horses",
      "b": [
       44,
       59,
       13,
       32
      ]
     },
     {
      "n": "Front wagon wheel",
      "b": [
       73,
       82,
       12,
       16
      ]
     },
     {
      "n": "Rear wagon wheel",
      "b": [
       91,
       76,
       8,
       20
      ]
     },
     {
      "n": "Distant wagon",
      "b": [
       11.5,
       57,
       4.5,
       6
      ]
     },
     {
      "n": "Second distant wagon",
      "b": [
       20.5,
       57,
       4,
       6
      ]
     },
     {
      "n": "Pointing arm",
      "b": [
       70,
       22,
       14,
       12
      ]
     },
     {
      "n": "Knife",
      "b": [
       56,
       48,
       6,
       10
      ]
     }
    ]
   },
   {
    "id": "art-philly-s32",
    "src": "images/art/philly-s32.jpg",
    "title": "Lightning Express",
    "credit": "Grok image art · Jang & Tom · Philadelphia Follies",
    "items": [
     {
      "n": "Lightning Express lettering",
      "b": [
       30,
       26,
       14,
       14
      ]
     },
     {
      "n": "Standing man's hat",
      "b": [
       47.5,
       8,
       8.5,
       8
      ]
     },
     {
      "n": "Red bandana",
      "b": [
       50,
       20,
       5,
       10
      ]
     },
     {
      "n": "Kneeling man's hat",
      "b": [
       13.5,
       31,
       10,
       11
      ]
     },
     {
      "n": "Wagon wheel",
      "b": [
       21,
       51,
       13,
       32
      ]
     },
     {
      "n": "Wheel hub",
      "b": [
       20,
       61,
       8,
       12
      ]
     },
     {
      "n": "Brown horse's head",
      "b": [
       68,
       9,
       16,
       22
      ]
     },
     {
      "n": "Row of red wagons",
      "b": [
       84,
       36,
       15,
       28
      ]
     },
     {
      "n": "Standing man's boots",
      "b": [
       46,
       70,
       10,
       16
      ]
     },
     {
      "n": "Kneeling man's beard",
      "b": [
       8,
       42,
       8,
       10
      ]
     }
    ]
   },
   {
    "id": "art-transcon-s37",
    "src": "images/art/transcon-s37.jpg",
    "title": "The Alpaca Coach",
    "credit": "Grok image art · Jang & Tom · Transcontinental",
    "items": [
     {
      "n": "Alpacas in the coach window",
      "b": [
       13,
       18,
       16,
       20
      ]
     },
     {
      "n": "Bearded man's hat",
      "b": [
       45,
       18,
       12,
       10
      ]
     },
     {
      "n": "Bucket man's hat",
      "b": [
       62,
       22,
       10,
       8
      ]
     },
     {
      "n": "Bucket",
      "b": [
       57.5,
       39,
       7,
       11
      ]
     },
     {
      "n": "Log cabin",
      "b": [
       67,
       13,
       22,
       26
      ]
     },
     {
      "n": "Alpaca on the roof",
      "b": [
       71.5,
       1,
       7,
       11
      ]
     },
     {
      "n": "Alpaca by the coach",
      "b": [
       17,
       45,
       16,
       28
      ]
     },
     {
      "n": "Front alpaca",
      "b": [
       71,
       57,
       14,
       32
      ]
     },
     {
      "n": "Alpaca near the cabin",
      "b": [
       76,
       40,
       9,
       16
      ]
     },
     {
      "n": "Grain in the air",
      "b": [
       40,
       30,
       12,
       14
      ]
     },
     {
      "n": "Coach window",
      "b": [
       8,
       16,
       12,
       16
      ]
     }
    ]
   },
   {
    "id": "art-philly-s37",
    "src": "images/art/philly-s37.jpg",
    "title": "Tipping His Hat",
    "credit": "Grok image art · Jang & Tom · Philadelphia Follies",
    "items": [
     {
      "n": "Rider's black hat",
      "b": [
       18,
       7.5,
       10.5,
       7
      ]
     },
     {
      "n": "Black horse's head",
      "b": [
       35,
       24,
       9.5,
       24
      ]
     },
     {
      "n": "Holstered revolver",
      "b": [
       15.5,
       40,
       3.5,
       14
      ]
     },
     {
      "n": "Saddle",
      "b": [
       21,
       41.5,
       5.5,
       18
      ]
     },
     {
      "n": "Setting sun",
      "b": [
       47.5,
       39.5,
       4,
       4.5
      ]
     },
     {
      "n": "Red neckerchief",
      "b": [
       60.5,
       40,
       4.5,
       9.5
      ]
     },
     {
      "n": "Bearded man's brown hat",
      "b": [
       71,
       20.5,
       10.5,
       11.5
      ]
     },
     {
      "n": "Large wagon wheel",
      "b": [
       81.5,
       50.5,
       13,
       32
      ]
     },
     {
      "n": "Small wagon wheel",
      "b": [
       50,
       53.5,
       4.5,
       18
      ]
     },
     {
      "n": "Canvas tarp",
      "b": [
       80.5,
       13.5,
       18,
       14
      ]
     },
     {
      "n": "Pine trees",
      "b": [
       88,
       8,
       12,
       28
      ]
     }
    ]
   },
   {
    "id": "transcon-s53",
    "src": "images/art/transcon-s53.jpg",
    "title": "Camp Supper",
    "credit": "Grok image art · Jang & Tom · Transcontinental",
    "items": [
     {
      "n": "Cowboy hat",
      "b": [
       20,
       6.5,
       8.5,
       8.5
      ]
     },
     {
      "n": "Horse",
      "b": [
       12,
       24,
       19,
       57
      ]
     },
     {
      "n": "Longhorn steer",
      "b": [
       0,
       44,
       11.5,
       24
      ]
     },
     {
      "n": "Black longhorn",
      "b": [
       34.5,
       41,
       10,
       21.5
      ]
     },
     {
      "n": "Barrel of lobsters",
      "b": [
       61,
       4,
       12.5,
       11
      ]
     },
     {
      "n": "Barrel of ice",
      "b": [
       84,
       10.5,
       14.5,
       25
      ]
     },
     {
      "n": "Apron",
      "b": [
       51,
       37.5,
       12.5,
       44
      ]
     },
     {
      "n": "Red neckerchief",
      "b": [
       58.5,
       31.5,
       4,
       8.5
      ]
     },
     {
      "n": "Frying pan",
      "b": [
       53,
       75.5,
       23,
       14
      ]
     },
     {
      "n": "Campfire",
      "b": [
       60.5,
       87.5,
       13,
       12.5
      ]
     },
     {
      "n": "Cooking pot",
      "b": [
       37,
       81.5,
       11,
       18.5
      ]
     },
     {
      "n": "Wagon wheel",
      "b": [
       42.5,
       50,
       7.5,
       28.5
      ]
     }
    ]
   },
   {
    "id": "art-transcon-s58",
    "src": "images/art/transcon-s58.jpg",
    "title": "The Steamer",
    "credit": "Grok image art · Jang & Tom · Transcontinental",
    "items": [
     {
      "n": "Paddle steamer",
      "b": [
       24.5,
       41.5,
       30,
       32
      ]
     },
     {
      "n": "Smokestack",
      "b": [
       41.5,
       45.5,
       3,
       16
      ]
     },
     {
      "n": "Smoke plume",
      "b": [
       17,
       25.5,
       24,
       18
      ]
     },
     {
      "n": "Front paddlewheel",
      "b": [
       40,
       64,
       7.5,
       12
      ]
     },
     {
      "n": "Rear paddlewheel",
      "b": [
       47.5,
       63.5,
       5.5,
       10
      ]
     },
     {
      "n": "Front mast",
      "b": [
       34,
       41.5,
       2.5,
       18
      ]
     },
     {
      "n": "Rear mast",
      "b": [
       49,
       43,
       2.5,
       18
      ]
     },
     {
      "n": "Large seagull",
      "b": [
       26,
       14.5,
       7,
       6
      ]
     },
     {
      "n": "Seagull",
      "b": [
       4,
       25,
       3.5,
       3.5
      ]
     },
     {
      "n": "Sun",
      "b": [
       76.5,
       43,
       5,
       7.5
      ]
     },
     {
      "n": "Sun on the water",
      "b": [
       75,
       61,
       8,
       22
      ]
     },
     {
      "n": "Rocky headland",
      "b": [
       81,
       50.5,
       16,
       12
      ]
     }
    ]
   },
   {
    "id": "art-philly-s59",
    "src": "images/art/philly-s59.jpg",
    "title": "Wagon Line",
    "credit": "Grok image art · Jang & Tom · Philadelphia Follies",
    "items": [
     {
      "n": "Setting sun",
      "b": [
       71.5,
       56,
       4,
       4.5
      ]
     },
     {
      "n": "Lead covered wagon",
      "b": [
       20,
       58,
       16,
       20
      ]
     },
     {
      "n": "Lead wagon wheel",
      "b": [
       27,
       74,
       4.5,
       9
      ]
     },
     {
      "n": "Two men walking",
      "b": [
       14,
       71,
       6.5,
       11
      ]
     },
     {
      "n": "Man beside the lead wagon",
      "b": [
       34,
       72,
       2.8,
       11
      ]
     },
     {
      "n": "Second covered wagon",
      "b": [
       42.5,
       62.5,
       9.5,
       13
      ]
     },
     {
      "n": "Third covered wagon",
      "b": [
       54,
       64.5,
       6,
       9
      ]
     },
     {
      "n": "Fourth covered wagon",
      "b": [
       61.5,
       65.5,
       4.5,
       7
      ]
     },
     {
      "n": "Oxen",
      "b": [
       37.5,
       70.5,
       5.5,
       9
      ]
     },
     {
      "n": "Man by the second wagon",
      "b": [
       49,
       70.5,
       2.8,
       10
      ]
     },
     {
      "n": "Rocky outcrop",
      "b": [
       0,
       54,
       14,
       8
      ]
     },
     {
      "n": "Sagebrush",
      "b": [
       83.5,
       81.5,
       12,
       14
      ]
     }
    ]
   }
  ]
 },
 {
  "id": "rusty",
  "name": "The Rusty Stack",
  "sound": "airship",
  "pics": [
   {
    "id": "rusty-stack",
    "src": "images/rusty-stack-game.jpg",
    "title": "The Rusty Stack",
    "credit": "Game art · The Rusty Stack Adventures",
    "items": [
     {
      "n": "Rusty patched panels",
      "b": [
       39,
       76,
       21,
       24
      ]
     },
     {
      "n": "Envelope nose",
      "b": [
       74,
       46,
       12,
       32
      ]
     },
     {
      "n": "Brown tail fin",
      "b": [
       10.5,
       69,
       16.5,
       26
      ]
     },
     {
      "n": "Dark tail spike",
      "b": [
       9,
       63,
       14,
       8
      ]
     },
     {
      "n": "Bow spar",
      "b": [
       82,
       37,
       14,
       11
      ]
     },
     {
      "n": "Lightning flash",
      "b": [
       5,
       38,
       11.5,
       20
      ]
     },
     {
      "n": "Lightning bolt",
      "b": [
       29.5,
       35.5,
       11.5,
       27
      ]
     },
     {
      "n": "Lower lightning",
      "b": [
       1,
       62,
       13.5,
       38
      ]
     },
     {
      "n": "Distant sky ship",
      "b": [
       84.5,
       62.5,
       12,
       31
      ]
     }
    ]
   }
  ]
 }
];
const ISPY_PICS = ISPY_BOOKS.flatMap(book => book.pics.map(p => Object.assign({ book: book.name }, p)));
const ROUND = 5;
const Ambience = window.ISpyAmbience || { unlock(){}, play(){}, stop(){}, toggle(){ return false; }, found(){}, get muted(){ return false; }, get running(){ return false; } };

(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const gal = $("#ispy-gallery"), game = $("#ispy-game"), img = $("#ispy-img"), pic = $("#ispy-pic"), view = $("#ispy-view"), marks = $("#ispy-marks");
  const list = $("#ispy-items"), fEl = $("#is-found"), ofEl = $("#is-of"), tEl = $("#is-time"), sEl = $("#is-score"), win = $("#ispy-win");
  const muteBtn = $("#is-mute");
  let P = null, targets = [], found = new Set(), misses = 0, hints = 0, start = 0, clock = null, over = false, zoom = 1, armed = false;

  gal.innerHTML = ISPY_BOOKS.map(book => {
    const cards = book.pics.map(p => {
      const i = ISPY_PICS.indexOf(ISPY_PICS.find(q => q.id === p.id));
      return `<button type="button" class="ispy-card" role="listitem" data-i="${i}">
        <span class="ispy-card-img"><img src="${p.src}" alt="${p.src === "images/jang-and-tom-wagon-masters.jpg" ? "Cover of Jang and Tom: Wagon Masters by Jason Collier: two unqualified Philadelphia debtors sell themselves as expert wagon-train guides" : ""}" loading="lazy"></span>
        <span class="ispy-card-t"><strong>${esc(p.title)}</strong><em>${p.items.length} things hidden · ${esc(p.credit)}</em></span>
      </button>`;
    }).join("");
    return `<section class="ispy-book"><h2 class="ispy-book-h">${esc(book.name)}</h2><div class="ispy-cards" role="list">${cards}</div></section>`;
  }).join("");

  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const secs = () => start ? (performance.now() - start) / 1000 : 0;
  const score = () => Math.max(0, found.size * 100 - misses * 10 - hints * 50);
  const shuffle = a => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  function hud() { fEl.textContent = found.size; sEl.textContent = score(); }
  function renderList() {
    list.innerHTML = targets.map((t, i) => `<li class="${found.has(i) ? "done" : ""}">${esc(t.n)}</li>`).join("");
  }
  function box(t, cls) {
    const [x, y, w, h] = t.b, el = document.createElement("div");
    el.className = cls;
    el.style.cssText = `left:${x}%;top:${y}%;width:${w}%;height:${h}%`;
    marks.appendChild(el);
    return el;
  }
  function markFound(t) {
    const flash = box(t, "mk-flash");
    setTimeout(() => flash.remove(), 1000);
    const [x, y, w, h] = t.b;
    const dot = document.createElement("div");
    dot.className = "mk-dot";
    dot.style.left = (x + w / 2) + "%";
    dot.style.top = (y + h / 2) + "%";
    dot.textContent = "✓";
    marks.appendChild(dot);
  }
  function setZoom(z) {
    const cx = (view.scrollLeft + view.clientWidth / 2) / (view.scrollWidth || 1);
    const cy = (view.scrollTop + view.clientHeight / 2) / (view.scrollHeight || 1);
    zoom = Math.min(3, Math.max(1, z));
    pic.style.width = (zoom * 100) + "%";
    view.classList.toggle("zoomed", zoom > 1);
    view.scrollLeft = cx * view.scrollWidth - view.clientWidth / 2;
    view.scrollTop = cy * view.scrollHeight - view.clientHeight / 2;
  }
  function newRound() {
    const n = Math.min(ROUND, P.items.length);
    targets = shuffle(P.items).slice(0, n);
    found = new Set();
    misses = 0;
    hints = 0;
    start = 0;
    over = false;
    clearInterval(clock);
    tEl.textContent = "0:00";
    ofEl.textContent = String(n);
    marks.innerHTML = "";
    win.hidden = true;
    renderList();
    hud();
  }
  function arm() {
    if (armed) return;
    armed = true;
    Ambience.unlock();
    if (P && !game.hidden) Ambience.play(P.src);
  }
  function paintMute() {
    const off = Ambience.muted;
    muteBtn.textContent = off ? "Sound off" : "Sound on";
    muteBtn.setAttribute("aria-pressed", off ? "true" : "false");
    muteBtn.classList.toggle("is-muted", off);
  }
  function open(i, fromUser) {
    P = ISPY_PICS[i];
    img.src = P.src;
    img.alt = P.title + ", " + P.credit;
    $("#ispy-credit").textContent = P.title + " · " + P.credit;
    gal.hidden = true;
    game.hidden = false;
    setZoom(1);
    newRound();
    if (fromUser) armed = true;
    if (armed) {
      Ambience.unlock();
      Ambience.play(P.src);
    }
    history.replaceState(null, "", "#" + P.id);
    game.scrollIntoView({ block: "start" });
  }
  function close() {
    game.hidden = true;
    gal.hidden = false;
    clearInterval(clock);
    Ambience.stop();
    history.replaceState(null, "", location.pathname);
  }
  document.addEventListener("pointerdown", arm);
  gal.addEventListener("click", e => {
    const b = e.target.closest(".ispy-card");
    if (b) open(+b.dataset.i, true);
  });
  pic.addEventListener("click", e => {
    if (over) return;
    const r = pic.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * 100;
    const py = (e.clientY - r.top) / r.height * 100;
    if (!start) {
      start = performance.now();
      clock = setInterval(() => { tEl.textContent = fmt(secs()); }, 250);
    }
    const tol = 2;
    const hits = targets.map((t, i) => ({ t, i })).filter(({ t, i }) => !found.has(i) && px >= t.b[0] - tol && px <= t.b[0] + t.b[2] + tol && py >= t.b[1] - tol && py <= t.b[1] + t.b[3] + tol)
      .sort((a, b) => a.t.b[2] * a.t.b[3] - b.t.b[2] * b.t.b[3]);
    if (hits.length) {
      const { t, i } = hits[0];
      found.add(i);
      markFound(t);
      Ambience.found();
      renderList();
      hud();
      if (found.size === targets.length) {
        over = true;
        clearInterval(clock);
        $("#ispy-win-h").textContent = targets.length === 5 ? "All five found" : `All ${targets.length} found`;
        $("#ispy-win-text").textContent = `Time ${fmt(secs())} · Score ${score()} · ${misses} miss${misses === 1 ? "" : "es"}${hints ? ` · ${hints} hint${hints === 1 ? "" : "s"}` : ""}`;
        win.hidden = false;
      }
    } else {
      misses++;
      hud();
      const m = document.createElement("div");
      m.className = "mk-miss";
      m.style.cssText = `left:${px}%;top:${py}%`;
      marks.appendChild(m);
      setTimeout(() => m.remove(), 800);
    }
  });
  $("#is-hint").addEventListener("click", () => {
    if (over) return;
    const left = targets.map((t, i) => i).filter(i => !found.has(i));
    if (!left.length) return;
    hints++;
    hud();
    const t = targets[left[Math.floor(Math.random() * left.length)]];
    const [x, y, w, h] = t.b, pad = Math.max(w, h) * 0.6;
    const el = box({ b: [Math.max(0, x - pad), Math.max(0, y - pad), Math.min(100, w + pad * 2), Math.min(100, h + pad * 2)] }, "mk-hint");
    setTimeout(() => el.remove(), 2200);
    if (zoom > 1) {
      view.scrollLeft = (x + w / 2) / 100 * view.scrollWidth - view.clientWidth / 2;
      view.scrollTop = (y + h / 2) / 100 * view.scrollHeight - view.clientHeight / 2;
    }
  });
  $("#is-new").addEventListener("click", newRound);
  $("#is-again").addEventListener("click", newRound);
  $("#is-back").addEventListener("click", close);
  $("#is-other").addEventListener("click", close);
  muteBtn.addEventListener("click", () => {
    arm();
    Ambience.toggle();
    paintMute();
  });
  $("#is-zin").addEventListener("click", () => setZoom(zoom + 0.5));
  $("#is-zout").addEventListener("click", () => setZoom(zoom - 0.5));
  paintMute();
  const hash = location.hash.slice(1);
  const hashed = ISPY_PICS.findIndex(p => p.id === hash);
  if (hashed >= 0) open(hashed);
  window.__ispy = {
    open,
    close,
    newRound,
    pics: ISPY_PICS,
    get targets() { return targets; },
    get found() { return found.size; },
    pic,
    ambience: Ambience
  };
})();
