## Wed 2/25/26

I'm populating the tool with the items from my closet. I've noticed the following.
- The image upload button should be disabled when there's no upload added. This can cause an error.
- The share/copy text button seems to have a broken share link.
    - librecloset.lazz.tech/share/outfit/c8241de8-5c97-4ac5-8116-fa43e9127432 vs librecloset.lazz.tech/share/?shareableId=c8241de8-5c97-4ac5-8116-fa43e9127432&type=outfit
    - Also then when going to a valid librecloset.lazz.tech/share/?shareableId=c8241de8-5c97-4ac5-8116-fa43e9127432&type=outfit link it has a broken image
    - The openGraphService.getShareableTagValues needs to add support for this outfit or garment type
- Search and sort features will be needed
- Refreshing seems to update the sw cache as desired from what I can tell