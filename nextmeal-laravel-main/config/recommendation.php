<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Expiration reference (h) in days
    |--------------------------------------------------------------------------
    | Used for expiration urgency: uj = (h - dj) / h when 0 < dj <= h.
    | Ingredients expiring within this window get a non-zero urgency score.
    */
    'expiration_reference_days' => (int) env('RECOMMENDATION_EXPIRATION_REFERENCE_DAYS', 3),

];
