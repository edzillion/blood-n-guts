1. Use token.center ? Align tokens
2. -update container positioning to make more sense-
3. -base blood colour on race etc-
4. mask flicker, addChild?
5. control flow review, await always needed?
6. -change bleeding to flag on token-
7. remove cut-off glyphs
8. use preloadTemplates to trigger DOM font loading
9. wire up advanced config form
10. order of settings in config window
11. clearly separate token from tokenData objects



canvas.tokens = the canvas Tokens layer of the currently VIEWED scene
the active scene is NOT necessarily the "viewed" scene!
(though it often is)
anyway if you want the data object of the token, you can get it from game.scenes, but more likely what you want is the instanciated instance of Token on the board, which is in canvas.tokens.placeables
(which will also have the data object of the token)
game.scenes method is mostly only if you need to mess with token data of an un-viewed scene for some reason


vance, skimble
