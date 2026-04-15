-- Remove arrow symbols from all markdown links in blog content
-- Pattern: [Text →](/path) becomes [Text](/path)
UPDATE blog_posts 
SET content = regexp_replace(
  content, 
  '\[([^\]]*?)\s*→\s*\]\(([^\)]+)\)', 
  '[\1](\2)', 
  'g'
)
WHERE content ~ '\[.*→.*\]\(.*\)';
