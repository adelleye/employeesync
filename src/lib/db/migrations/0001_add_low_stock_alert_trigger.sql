-- Function to check for low stock and insert an alert
CREATE OR REPLACE FUNCTION handle_low_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if qtyOnHand is below reorderPoint (and reorderPoint is not null)
    IF NEW.qty_on_hand IS NOT NULL AND NEW.reorder_point IS NOT NULL AND NEW.qty_on_hand < NEW.reorder_point THEN
        -- Check if there's already an open (unresolved) alert for this item
        IF NOT EXISTS (
            SELECT 1
            FROM public.item_alerts -- Explicitly schema-qualify if needed
            WHERE item_id = NEW.id AND resolved_at IS NULL
        ) THEN
            -- Insert a new alert
            INSERT INTO public.item_alerts (item_id, company_id, message, triggering_qty, reorder_point_at_trigger, created_at)
            VALUES (
                NEW.id,
                NEW.company_id, 
                'Item "' || NEW.name || '" (SKU: ' || COALESCE(NEW.sku, 'N/A') || ') is low on stock. Current quantity: ' || NEW.qty_on_hand || ', Reorder point: ' || NEW.reorder_point,
                NEW.qty_on_hand,
                NEW.reorder_point,
                NOW()
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function after an insert or update on the items table
CREATE TRIGGER low_stock_alert_trigger
AFTER INSERT OR UPDATE OF qty_on_hand, reorder_point ON public.items -- Explicitly schema-qualify if needed
FOR EACH ROW
EXECUTE FUNCTION handle_low_stock_alert(); 