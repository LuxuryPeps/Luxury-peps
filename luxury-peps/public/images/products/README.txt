HOW TO ADD OR CHANGE A PRODUCT PHOTO
=====================================

Your product photos live in this folder. To add a new one or swap an
existing one, you just drop an image file in here and rebuild the site.
No code editing.

STEP BY STEP
------------
1. Save your product image as a .jpg file.
2. Name the file using the product's ID from the list below.
   Example: to set the Ipamorelin photo, name the file  p05.jpg
3. Put the file in this folder:  public/images/products/
4. Rebuild and redeploy:
      npm run build
   then drag the new  dist  folder to Netlify Drop (same as always).

That's it. The site automatically uses your file. To replace a photo,
just save a new file with the same name (overwrite the old one) and
rebuild. If there's no file for a product, the site shows the built-in
image instead, so nothing ever breaks.

TIPS
----
- Use .jpg files. Keep them under ~1 MB each so the site loads fast.
- Portrait images (taller than wide) look best, like the spec cards.
- The file name must match the ID exactly and be lowercase: p05.jpg


FILE NAME FOR EACH PRODUCT
--------------------------
p01.jpg  =  BPC-157
p02.jpg  =  TB-500
p03.jpg  =  GLP1  (Semaglutide)
p04.jpg  =  GLP2  (Tirzepatide)
p05.jpg  =  Ipamorelin
p06.jpg  =  CJC-1295 (No DAC)
p07.jpg  =  Melanotan II
p08.jpg  =  GHK-Cu
p09.jpg  =  Epithalon
p11.jpg  =  Selank
p12.jpg  =  Semax
p15.jpg  =  Sermorelin
p19.jpg  =  MOTS-c
p21.jpg  =  GLP3  (Retatrutide)
p22.jpg  =  NAD+
p23.jpg  =  Oxytocin Acetate
p24.jpg  =  SS-31
p25.jpg  =  VIP
p26.jpg  =  5-Amino-1MQ
p27.jpg  =  Bacteriostatic Water
p28.jpg  =  Glutathione
p29.jpg  =  BPC-157 + TB-500
p30.jpg  =  HCG
p31.jpg  =  Tesamorelin
p32.jpg  =  IGF-1 LR3
p33.jpg  =  CJC-1295 + Ipamorelin
p34.jpg  =  GHK-Cu + BPC-157 + TB-500

The 12 files already in this folder are examples you can look at or
replace. The other products don't have a file yet — add one whenever
you're ready, using the name above.
