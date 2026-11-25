UPDATE content
SET image_url = NULL
WHERE image_url IS NOT NULL AND image_url <> '';
