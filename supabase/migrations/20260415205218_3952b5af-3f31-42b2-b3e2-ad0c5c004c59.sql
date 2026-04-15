-- Replace all variations of Legados Eternos links pointing to /memoriales
UPDATE blog_posts 
SET content = REPLACE(
  REPLACE(
    REPLACE(content, '[Legados Eternos →](/memoriales)', '[Legados Eternos](/legados-eternos)'),
    '[Legados Eternos](/memoriales)', '[Legados Eternos](/legados-eternos)'
  ),
  '/memoriales', '/legados-eternos'
)
WHERE content LIKE '%/memoriales%';
