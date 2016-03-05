function CPBoxBlurDialog() {
    var
        dialog = document.createElement("dialog");
    
    /* TODO
    JPanel panel = new JPanel();
    
    panel.add(new JLabel("Blur amount:"));
    SpinnerModel blurXSM = new SpinnerNumberModel(3, 1, 100, 1);
    JSpinner blurX = new JSpinner(blurXSM);
    panel.add(blurX);
    
    panel.add(new JLabel("Iterations:"));
    SpinnerModel iterSM = new SpinnerNumberModel(1, 1, 8, 1);
    JSpinner iter = new JSpinner(iterSM);
    panel.add(iter);
    
    Object[] array = { "Box blur\n\n", panel };
    int choice = JOptionPane.showConfirmDialog(getDialogParent(), array, "Box Blur", JOptionPane.OK_CANCEL_OPTION,
            JOptionPane.PLAIN_MESSAGE);
    
    if (choice == JOptionPane.OK_OPTION) {
        int blur = ((Integer) blurX.getValue()).intValue();
        int iterations = ((Integer) iter.getValue()).intValue();
    
        artwork.boxBlur(blur, blur, iterations);
        canvas.repaintAll();
    }*/
}